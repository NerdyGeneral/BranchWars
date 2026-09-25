const CUSTOMER_SEGMENTS={
 everyday:{name:'Everyday households',fit:{essential:1.2,rewards:.9,highYield:.6},onboarding:.0015},
 connected:{name:'Digitally active customers',fit:{essential:.75,rewards:1.25,highYield:.9},onboarding:.0025},
 reserve:{name:'Reserve savers',fit:{essential:.7,rewards:.85,highYield:1.25},onboarding:.001}
};
const CUSTOMER_MARKETS={
 downtown:{everyday:40,connected:35,reserve:25},northside:{everyday:55,connected:20,reserve:25},
 industrial:{everyday:50,connected:30,reserve:20},suburbs:{everyday:45,connected:30,reserve:25},
 county_seat:{everyday:25,connected:15,reserve:60},university:{everyday:20,connected:65,reserve:15}
};
