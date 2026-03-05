import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Phase5 } from './phase5';

describe('Phase5', () => {
  let component: Phase5;
  let fixture: ComponentFixture<Phase5>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Phase5],
    }).compileComponents();

    fixture = TestBed.createComponent(Phase5);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
