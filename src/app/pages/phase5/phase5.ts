import { Component } from '@angular/core';
import { Phase, PhaseData } from '../../services/phase';
import { Home } from '../home/home';
import { Week1 } from './weeks/week1';
import { Week2 } from './weeks/week2';
import { Week3 } from './weeks/week3';

@Component({
  selector: 'app-phase5',
  imports: [Home,Week1,Week2,Week3],
  templateUrl: './phase5.html',
  styleUrl: './phase5.css',
})
export class Phase5 {

  selectedWeekId: number = 1;
  weeks: PhaseData[] = [];
  
  constructor(private phase: Phase) {
    this.weeks = this.phase.getPhase('phase5');
  }

  loadWeek(weekId: number) {
    this.selectedWeekId = weekId;
  }

  get progressPercentage(): number {
    if (!this.selectedWeekId) return 0;
    return (this.selectedWeekId / this.weeks.length) * 100;
  }

  get progressLabel(): string {
    if (!this.selectedWeekId) return 'Selecciona una semana para comenzar';
    return `Semana  ${this.selectedWeekId} de ${this.weeks.length} completada`;
  }

  get titleWeek(): string {
    if (!this.selectedWeekId) return 'Roadmap .NET Developer';
    const currentWeek = this.weeks.find(week => week.id === this.selectedWeekId);
    return currentWeek ? currentWeek.description : 'Semana no encontrada';
  }
}
