import { Component } from '@angular/core';
import { Phase, PhaseData } from '../../services/phase';
import { Week1 } from './weeks/week1';
import { Week2 } from './weeks/week2';
import { Week3 } from './weeks/week3';
import { Week4 } from './weeks/week4';
import { Week5 } from './weeks/week5';
import { Week6 } from './weeks/week6';
import { Home } from '../home/home';

@Component({
  selector: 'app-phase3',
  imports: [Home,Week1,Week2,Week3,Week4,Week5,Week6],
  templateUrl: './phase3.html',
  styleUrl: './phase3.css',
})
export class Phase3 {

  selectedWeekId: number = 1;
  weeks: PhaseData[] = [];
  
  constructor(private phase: Phase) {
    this.weeks = this.phase.getPhase('phase3');
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
