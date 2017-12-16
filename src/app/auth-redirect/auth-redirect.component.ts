import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../auth.service';
import { switchMap, tap } from 'rxjs/operators';
import { fromPromise } from 'rxjs/observable/fromPromise';

@Component({
  selector: 'auth-redirect',
  templateUrl: './auth-redirect.component.html',
  styleUrls: ['./auth-redirect.component.sass']
})
export class AuthRedirectComponent implements OnInit {

  constructor(private http: HttpClient, private route: ActivatedRoute, private auth: AuthService) { }

  ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code')

    if (code) {
      const url = `http://localhost:5000/firestarter-96e46/us-central1/token?code=${code}`;

      this.http.post<any>(url, {}).pipe(
        switchMap(res => fromPromise( this.auth.customSignIn(res.authToken) ))
      )
      .subscribe()

    }
  }

}
