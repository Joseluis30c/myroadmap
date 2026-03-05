import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Phase1 } from './phase1';

describe('Phase1', () => {
  let component: Phase1;
  let fixture: ComponentFixture<Phase1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Phase1],
    }).compileComponents();

    fixture = TestBed.createComponent(Phase1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
