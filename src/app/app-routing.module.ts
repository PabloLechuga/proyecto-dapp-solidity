import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login-tabs',
    pathMatch: 'full'
  },
  {
    path: 'login-tabs',
    loadChildren: () => import('./login-tabs/tabs/tabs.module').then(m => m.TabsLoginPageModule)
  },
  {
    path: 'user-tabs',
    loadChildren: () => import('./user-tabs/tabs/tabs.module').then(m => m.TabsUserPageModule)
  },
  {
    path: 'artist-tabs',
    loadChildren: () => import('./artist-tabs/tabs/tabs.module').then(m => m.TabsArtistPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
