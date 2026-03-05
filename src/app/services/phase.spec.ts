import { TestBed } from '@angular/core/testing';

import { Phase } from './phase';

describe('Phase', () => {
  let service: Phase;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Phase);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
