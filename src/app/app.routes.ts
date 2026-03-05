import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Phase1 } from './pages/phase1/phase1';
import { Phase2 } from './pages/phase2/phase2';
import { Phase3 } from './pages/phase3/phase3';
import { Phase4 } from './pages/phase4/phase4';
import { Phase5 } from './pages/phase5/phase5';

export const routes: Routes = [
    {path: '', component:Home},
    {path: 'phase1', component:Phase1},
    {path: 'phase2', component:Phase2},
    {path: 'phase3', component:Phase3},
    {path: 'phase4', component:Phase4},
    {path: 'phase5', component:Phase5},
    {path: '**', redirectTo: ''}
];
