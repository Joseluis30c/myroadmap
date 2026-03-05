import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Phase2 } from './phase2';

describe('Phase2', () => {
  let component: Phase2;
  let fixture: ComponentFixture<Phase2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Phase2],
    }).compileComponents();

    fixture = TestBed.createComponent(Phase2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
