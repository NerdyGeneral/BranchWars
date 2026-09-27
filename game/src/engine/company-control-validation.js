function validateCompanyControlOwner(p,ids,month){
 const s=p.companyControl;
 if(!investmentExact(s,['version','diligence','deals','paused'])||s.version!==1||!s.diligence||Array.isArray(s.diligence)||Object.keys(s.diligence).some(id=>!ids.includes(id))||!Array.isArray(s.deals)||s.deals.length>24||!Array.isArray(s.paused)||s.paused.length>6||new Set(s.paused).size!==s.paused.length)throw Error('Invalid company control owner records.');
 for(const [id,d]of Object.entries(s.diligence)){CompanyControl.validateDiligence(d);if(d.issuer!==id||d.owner!==p.financialGroup.parent.entityId||d.commissionedMonth>month)throw Error('Foreign or future diligence record.');}
 const seen=new Set();let debt=0,payables=0;
 for(const d of s.deals){CompanyControlSettlement.validate(d);if(d.offer.buyer!==p.id||d.diligence.owner!==p.financialGroup.parent.entityId||!ids.includes(d.offer.issuer)||d.offer.submittedMonth>month||d.offer.id!==p.id+':control:'+d.offer.submittedMonth+':'+d.offer.issuer||seen.has(d.offer.id))throw Error('Invalid company control ownership or identity.');seen.add(d.offer.id);
  if(d.status==='closed'){if(d.loan.lender!=='company:acquisition-lender'||d.loan.servicedThrough!==month||d.integration.processedThrough!==month)throw Error('Unsettled company control obligations.');debt+=d.loan.original-d.loan.principalPaid;payables+=d.loan.interestDue;}
 }
 for(const id of s.paused)if(!s.deals.some(d=>d.offer.id===id&&d.status==='closed'&&d.integration.workDone<6))throw Error('Invalid paused integration.');
 for(const id of ids)if(p.companyShares.positions[id].shares>50000&&!s.deals.some(d=>d.status==='closed'&&d.offer.issuer===id))throw Error('Controlling votes have no completed reviewed acquisition.');
 if(debt!==p.financialGroup.parent.accounts.debt||payables!==p.financialGroup.parent.accounts.payables)throw Error('Parent acquisition liabilities do not reconcile.');
 return {debt,payables};
}
function validateCompanyControl(g){
 if(g.companyControlVersion===undefined){if(g.companyControlMarket!==undefined||g.players.some(p=>p.companyControl!==undefined||p.submitted?.companyControlPolicy!==undefined)||Object.values(g.lastPlans||{}).some(p=>p.companyControlPolicy!==undefined))throw Error('Unversioned company control state.');return;}
 const m=g.companyControlMarket,month=g.cycle-(g.gameOver?0:1),ids=g.companyShareMarket?.issuers.map(i=>i.id);
 if(g.companyControlVersion!==1||g.companySharesVersion!==1||g.version!==campaignVersion(g)||!investmentExact(m,['version','month','capital','lender','provider','expenses'])||m.version!==1||m.month!==month||m.capital!==Math.floor(g.companyShareMarket.capital/2)||!investmentWhole(m.expenses))throw Error('Invalid control campaign boundary.');
 GroupAccounting.validate(m.lender);GroupAccounting.validate(m.provider);
 if(m.lender.entityId!=='company:acquisition-lender'||m.provider.entityId!=='company:control-services'||g.companyShareMarket.outside.book.accounts.investments!==m.capital)throw Error('Invalid outside acquisition counterparties.');
 if(['investments','custodyAssets','custodyLiabilities','debt','payables'].some(k=>m.lender.accounts[k]||m.provider.accounts[k])||m.provider.accounts.businessAssets||m.provider.accounts.cash!==m.expenses||m.provider.retainedEarnings!==m.expenses||m.provider.accounts.equity!==m.expenses||m.lender.accounts.equity!==m.capital+m.lender.retainedEarnings)throw Error('Outside control funds do not reconcile.');
 let claims=0;
 for(const p of g.players){const due=validateCompanyControlOwner(p,ids,month);claims+=due.debt+due.payables;if(p.submitted)normalizeCompanyControlPlan(g,p,investmentCopy(p.submitted));}
 if(claims+OutsideFunding.claims(g)+PartnerCards.claims(g)!==m.lender.accounts.businessAssets)throw Error('Acquisition lender assets and parent obligations differ.');
}
function projectCompanyControl(g,out,index){
 if(g.companyControlVersion!==1)return;
 out.companyControlVersion=1;out.me.companyControl=investmentCopy(g.players[index].companyControl);
 out.companyControlSnapshot={version:1,month:g.companyControlMarket.month,lenderCash:g.companyControlMarket.lender.accounts.cash,offers:investmentCopy(companyControlOffers(g))};
 delete out.rival.companyControl;if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].companyControlPolicy;
}
function validateCompanyControlView(v){
 if(v.rival?.companyControl!==undefined||v.lastPlans?.[v.rival?.id]?.companyControlPolicy!==undefined)throw Error('Private control plans exposed.');
 if(v.companyControlVersion===undefined){if(v.companyControlSnapshot!==undefined||v.me?.companyControl!==undefined||v.me?.submitted?.companyControlPolicy!==undefined)throw Error('Unversioned control view.');return;}
 const s=v.companyControlSnapshot,month=v.cycle-(v.gameOver?0:1);
 if(v.companyControlVersion!==1||v.companySharesVersion!==1||v.version!==campaignVersion(v)||!investmentExact(s,['version','month','lenderCash','offers'])||s.version!==1||s.month!==month||!investmentWhole(s.lenderCash)||!Array.isArray(s.offers)||s.offers.length>12)throw Error('Invalid company control view.');
 const ids=v.companyShareSnapshot.issuers.map(i=>i.id);validateCompanyControlOwner(v.me,ids,month);const seen=new Set();
 for(const d of s.offers){if(!investmentExact(d,['offer','reviewMonth','defended']))throw Error('Invalid public control offer.');CompanyControl.validateOffer(d.offer);
  if(![v.me.id,v.rival.id].includes(d.offer.buyer)||!ids.includes(d.offer.issuer)||d.offer.submittedMonth>month||d.offer.id!==d.offer.buyer+':control:'+d.offer.submittedMonth+':'+d.offer.issuer||typeof d.defended!=='boolean'||d.reviewMonth!==d.offer.submittedMonth+1+(d.defended?1:0)||seen.has(d.offer.id))throw Error('Stale or malformed control offer.');seen.add(d.offer.id);
 }
 const owned=s.offers.filter(d=>d.offer.buyer===v.me.id),expected=v.me.companyControl.deals.filter(d=>d.status==='review').map(d=>({offer:d.offer,reviewMonth:d.reviewMonth,defended:d.defended}));
 if(JSON.stringify(owned)!==JSON.stringify(expected))throw Error('Own published offers do not match control records.');
 if(v.me.submitted&&typeof v.me.submitted==='object')normalizeCompanyControlPlan(v,v.me,investmentCopy(v.me.submitted));
}
