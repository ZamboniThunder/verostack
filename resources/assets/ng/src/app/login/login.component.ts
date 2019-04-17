import {Component, OnInit, AfterViewChecked, OnDestroy} from '@angular/core';
import {FormControl, Validators, NgForm} from '@angular/forms';
import {AuthService} from '../auth.service';
import {SessionService} from '../session.service';

import * as moment from 'moment';

import {User, IToken, ILocalStorage} from '../models/index';
import {UserService} from '../user-features/user.service';
import { MessageService } from '@app/message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Role } from '@app/models/role.model';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewChecked, OnDestroy {
    pageLoading: boolean;
    lockLoginInputs = false;
    redirectQueue: string[] = [];
    formSubmitted = false;

    user: User;

    username = new FormControl('', [Validators.required]);
    password = new FormControl('', [Validators.required]);

    constructor(
        public authService: AuthService,
        private session: SessionService,
        private userService: UserService,
        private msg: MessageService,
        private router:Router
    ) {}

    ngOnInit() {
        this.session.getUserItem().subscribe(u => {
            this.user = u;
            this.session.hideLoader();
        });
    }

    ngAfterViewChecked() {}

    ngOnDestroy() {
        this.lockLoginInputs = false;
    }

    onSubmit(f: NgForm) {
        this.session.showLoader();
        this.formSubmitted = true;

        const loginData: any = {
            username: f.value.username,
            password: f.value.password
        };

        if (f.form.valid) {
            this.lockLoginInputs = true;
            this.pageLoading = true;

            this.authService.ngLogin(loginData).subscribe(response => {
                this.pageLoading = false;
                this.lockLoginInputs = false;

                const sessionToken: ILocalStorage<IToken> = {
                    data: { access_token: response.token } as IToken,
                    expires: moment().valueOf() + 1000 * (60 * 24 * 3)
                };

                this.session.login(sessionToken);
                this.userService.storeNgUser(response.user);      
                
                if (response.user.role.role < Role.companyAdmin) {
                    this.router.navigate(['users', 'payroll', 'list']);
                } else {
                    this.router.navigate(['daily-tracker']);
                }

            }, (err: HttpErrorResponse) => this.httpErrorHandler(err));
        }
    }

    loginHandler() {
        this.pageLoading = false;
    }

    httpErrorHandler(e: HttpErrorResponse) {
        this.pageLoading = false;
        this.lockLoginInputs = false;
        this.password.setValue(null);
        this.msg.showWebApiError(e);
    }

    getErrorMessage() {
        return this.username.hasError('required')
            ? 'You must enter a value'
            : this.password.hasError('required')
                ? 'You must enter a value'
                : '';
    }
}
