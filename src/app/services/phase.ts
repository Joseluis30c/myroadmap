import { Injectable } from '@angular/core';

export interface PhaseData {
  id: number;
  name: string;
  description: string;
}

export type PhaseKey = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5';

@Injectable({
  providedIn: 'root',
})
export class Phase {
  constructor() {}

  private phase1: PhaseData[] = [
    { id: 1, name: '📅 Semana 1 - Fundamentos .NET', description: 'Fundamentos Avanzados de <span>.NET Core</span>' },
    { id: 2, name: '🏗 Semana 2 - Clean Architecture', description: 'Clean <span>Architecture</span> en .NET' },
    { id: 3, name: '🛡 Semana 3 - Validaciones & Manejo de Errores', description: 'Validaciones &amp; Manejo <span>Profesional de Errores' },
    { id: 4, name: '🧪 Semana 4 - Unit Testing', description: 'Unit <span>Testing</span> Profesional en .NET' },
    { id: 5, name: '🔐 Semana 5 - Seguridad en APIs', description: 'Seguridad en APIs — <span>JWT Robusto</span>' },
    { id: 6, name: '🏗 Semana 6 - Performance básico en backend', description: 'Performance Básico en Backend .NET' },
  ];

  private phase2: PhaseData[] = [
    { id: 1, name: '📅 Semana 7 - Execution Plans e Indexación', description: 'Execution Plans <span>& Indexación Profunda</span>' },
    { id: 2, name: '🏗 Semana 8 - Query Tuning avanzado', description: 'Query <span>Tuning</span> Avanzado' },
    { id: 3, name: '🧪 Semana 9 - Transacciones y concurrencia', description: 'Transacciones <span class="hl-cyan">&amp; Concurrencia Real</span>' },
    { id: 4, name: '🔐 Semana 10 - Optimización real aplicada', description: 'Optimización <span>Real Aplicada</span>' },
  ];

  private phase3: PhaseData[] = [
    { id: 1, name: '📅 Semana 11 - Fundamentos de Azure', description: '' },
    { id: 2, name: '🏗 Semana 12 - CI/CD', description: '' },
    { id: 3, name: '🛡 Semana 13 - Docker', description: '' },
    { id: 4, name: '🧪 Semana 14 - Deploy con Docker en Azure', description: '' },
    { id: 5, name: '🔐 Semana 15 - Redis (Caching)', description: '' },
    { id: 6, name: '🏗 Semana 16 - Mensajería básica', description: '' },
  ];

  private phase4: PhaseData[] = [
    { id: 1, name: '📅 Semana 17 -  Microservicios (conceptual y práctico)', description: '📅' },
    { id: 2, name: '🏗 Semana 18 - API Gateway + Versionamiento', description: '🏗' },
    { id: 3, name: '🛡 Semana 19 - Seguridad avanzada', description: '🛡' },
    { id: 4, name: '🧪 Semana 20 - Observabilidad', description: '🧪' },
    { id: 5, name: '🔐 Semana 21 - Refactorización profesional', description: '🔐' },
  ];

  private phase5: PhaseData[] = [
    { id: 1, name: '📅 Semana 22 – Inglés técnico', description: '📅' },
    { id: 2, name: '🏗 Semana 23 – Optimizar CV + LinkedIn', description: '🏗' },
    { id: 3, name: '🛡 Semana 24 – Preparación para entrevistas', description: '🛡' },
  ];

  getPhase(key: PhaseKey): PhaseData[] {
    switch (key) {
      case 'phase1':
        return this.phase1;
      case 'phase2':
        return this.phase2;
      case 'phase3':
        return this.phase3;
      case 'phase4':
        return this.phase4;
      case 'phase5':
        return this.phase5;
      default:
        throw new Error(`Unknown phase ${key}`);
    }
  }
}
