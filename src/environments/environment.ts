// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  ganache: {
    url: 'http://127.0.0.1:7545',
    networkId: 5777
  },
  contracts: {
    userRegistry: '0xDAF513f52E58bc32946D7b1b0175afE160435705',
    ticketNFT: '0x7f539D182992AD3442FceD13c1Ae3089AB0DAd35',
    marketplace: '0xAeED9C18BB7CcaE9c2f58a556b73FD149e9768d3'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
