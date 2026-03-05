import { Component } from '@angular/core';
import { PhaseData, Phase } from '../../services/phase';
import { Week1 } from './weeks/week1';
import { Week2 } from './weeks/week2';
import { Week3 } from './weeks/week3';
import { Week4 } from './weeks/week4';
import { Week5 } from './weeks/week5';
import { Week6 } from './weeks/week6';
import { Home } from '../home/home';

@Component({
  standalone: true,
  selector: 'app-phase1',
  imports: [Week1, Week2, Week3, Week4, Week5, Week6, Home],
  templateUrl: './phase1.html',
  styleUrl: './phase1.css',
})

export class Phase1 {
  selectedWeekId: number = 1;
  weeks: PhaseData[] = [];

  constructor(private phase:Phase) {
    this.weeks = this.phase.getPhase('phase1');
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