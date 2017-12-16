import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.sass']
})
export class UserDetailsComponent {

  wallets;

  constructor(public auth: AuthService, private http: HttpClient) { }

  getWallet() {
    this.wallets = this.auth.getIdToken().then(authToken => {
      const endpoint = 'http://localhost:5000/firestarter-96e46/us-central1/wallet';
      const headers = {'Authorization': 'Bearer ' + authToken }
      
      return this.http.get(endpoint, { headers }).toPromise()
    })
  }


}
