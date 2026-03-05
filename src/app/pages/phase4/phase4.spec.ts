import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Phase4 } from './phase4';

describe('Phase4', () => {
  let component: Phase4;
  let fixture: ComponentFixture<Phase4>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Phase4],
    }).compileComponents();

    fixture = TestBed.createComponent(Phase4);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
