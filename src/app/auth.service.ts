import { Injectable } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import * as firebase from 'firebase/app';

import { Observable } from 'rxjs/Observable';

@Injectable()
export class AuthService {

  user: Observable<firebase.User>;

  constructor(private afAuth: AngularFireAuth) {
    this.user = this.afAuth.authState
  }

  login() {
    const popup = window.open('http://localhost:5000/firestarter-96e46/us-central1/redirect', '_blank', 'height=700,width=800')
  }

  customSignIn(token) {
    return this.afAuth.auth.signInWithCustomToken(token).then(() => window.close() )
  }

  getIdToken() {
    return this.afAuth.auth.currentUser.getIdToken()
  }

  signout() {
    this.afAuth.auth.signOut()
  }

}



