import {Component, OnInit, ViewChild, ChangeDetectorRef, AfterViewChecked, AfterViewInit, AfterContentInit} from '@angular/core';
import {Observable, Subscription, of} from 'rxjs';
import {SessionService} from './session.service';
import {MatSidenav} from '@angular/material';
import {environment} from '@env/environment.prod';
import {MomentExtensions} from '@app/shared/moment-extensions';
import {SidenavService} from '@app/sidenav/sidenav.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewChecked, AfterContentInit {
    title = 'app';
    loading:boolean = true;
    loggedInStatus: Observable<boolean>;
    loading$: Observable<boolean>;
    opened$: Observable<boolean>;
    _loading:boolean;
    _loggedIn:boolean;

    @ViewChild('navigation') public sidenav: MatSidenav;

    routerSubscription:Subscription;

    constructor(
        private session: SessionService,
        private cd: ChangeDetectorRef,
        private sidenavService: SidenavService,
        private breakpointObserver:BreakpointObserver,
        private router:Router
    ) {
        let counter = 0;
        // wire up our extension methods
        MomentExtensions.init();
        this.session.loading$.subscribe(next => {
            // dev only bug -
            // https://stackoverflow.com/questions/39787038/how-to-manage-angular2-expression-has-changed-after-it-was-checked-exception-w
            if (!environment.production) this.cd.detectChanges();

            if(next == null) return;
            this.loading$ = of(next);
            this._loading = next;
        })
        this.session.isLoginSubject.subscribe(next => {
            if(next == null) return;
            this.loggedInStatus = of(next);
            this._loggedIn = next;
        });

        this.observeBreakpoints();
    }

    ngOnInit() {
        this.session.loadUserStorageItem();
    }

    ngAfterContentInit() {
        //Called after ngOnInit when the component's or directive's content has been initialized.
        //Add 'implements AfterContentInit' to the class.
        // this.loading = this.session.loadingState;
    }

    ngAfterViewChecked() {
        // initialize our sidenav service
        this.sidenavService.setSidenav(this.sidenav);

        // dev only bug -
        // https://stackoverflow.com/questions/39787038/how-to-manage-angular2-expression-has-changed-after-it-was-checked-exception-w
        if (!environment.production) this.cd.detectChanges();
    }

    /**
     * Observes the layout and if the viewport changes sizes to the size of a smartphone, 
     * this method calls a method to update services on the layout for mobile/desktop mode when applicable. 
     */
    private observeBreakpoints():void {
        this.breakpointObserver.observe([
            Breakpoints.Handset
        ]).subscribe(result => {
            if(result.matches)
                this.handleMobileViewport();
            else
                this.handleFullViewport();
        });
    }

    private handleMobileViewport() {
        this.routerSubscription = this.router.events.subscribe(() => {
            this.sidenavService.close();
        });
    }

    private handleFullViewport() {
        if(this.routerSubscription != null) 
            this.routerSubscription.unsubscribe();
    }
}
