import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  //standalone: true,
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {}
