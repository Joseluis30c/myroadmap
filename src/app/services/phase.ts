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
    { id: 1, name: 'Semana 1', description: 'Fundamentos Avanzados de <span>.NET Core</span>' },
    { id: 2, name: 'Semana 2', description: 'Clean <span>Architecture</span> en .NET' },
    { id: 3, name: 'Semana 3', description: 'Validaciones &amp; Manejo <span>Profesional de Errores' },
    { id: 4, name: 'Semana 4', description: 'Unit <span>Testing</span> Profesional en .NET' },
    { id: 5, name: 'Semana 5', description: 'Seguridad en APIs — <span>JWT Robusto</span>' },
    { id: 6, name: 'Semana 6', description: 'Performance Básico en Backend <span>.NET</span>' },
  ];

  private phase2: PhaseData[] = [
    { id: 1, name: 'Semana 7', description: 'Execution Plans <span>& Indexación Profunda</span>' },
    { id: 2, name: 'Semana 8', description: 'Query <span>Tuning</span> Avanzado' },
    { id: 3, name: 'Semana 9', description: 'Transacciones <span class="hl-cyan">&amp; Concurrencia Real</span>' },
    { id: 4, name: 'Semana 10', description: 'Optimización <span>Real Aplicada</span>' },
  ];

  private phase3: PhaseData[] = [
    { id: 1, name: 'Semana 11', description: 'Fundamentos de <span>Azure</span>' },
    { id: 2, name: 'Semana 12', description: 'CI/CD con <span>GitHub Actions</span>' },
    { id: 3, name: 'Semana 13', description: 'Docker para <span>.NET <span>Developers</span>' },
    { id: 4, name: 'Semana 14', description: 'Docker en <span>Azure Cloud</span>' },
    { id: 5, name: 'Semana 15', description: 'Redis <span>Cache para .NET</span>' },
    { id: 6, name: 'Semana 16', description: 'Mensajería <span>Asíncrona con Colas</span>' },
  ];

  private phase4: PhaseData[] = [
    { id: 1, name: 'Semana 17', description: 'Micro-<span>servicios</span> Conceptual y Práctico' },
    { id: 2, name: 'Semana 18', description: 'API Gateway <span>+ Versioning</span>' },
    { id: 3, name: 'Semana 19', description: 'Seguridad <span>Avanzada</span>' },
    { id: 4, name: 'Semana 20', description: 'Observa<span>bilidad</span>' },
    { id: 5, name: 'Semana 21', description: 'Refacto<span>rización</span>' },
  ];

  private phase5: PhaseData[] = [
    { id: 1, name: 'Semana 22', description: 'Inglés <span>Técnico</span>' },
    { id: 2, name: 'Semana 23', description: 'CV &amp; <span>LinkedIn</span>' },
    { id: 3, name: 'Semana 24', description: 'Entrena<span>miento</span>' },
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
