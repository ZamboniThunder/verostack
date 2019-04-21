import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DncContact, User } from '@app/models';
import { SessionService } from '@app/session.service';
import { SelectionModel, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject } from 'rxjs';
import { MatTableDataSource, MatDialog, MatBottomSheet } from '@angular/material';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AddDncContactDialogComponent } from './add-dnc-contact-dialog/add-dnc-contact-dialog.component';
import { KnockListService } from './knock-list.service';
import { MessageService } from '@app/message.service';
import { ConfirmDeleteSheetComponent } from './confirm-delete-sheet/confirm-delete-sheet.component';

@Component({
    selector: 'vs-knock-list',
    templateUrl: './knock-list.component.html',
    styleUrls: ['./knock-list.component.scss'],
    animations: [
        trigger('showHideActionBar', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('0.5s', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('0.5s', style({ opacity: 0 }))
            ])
        ]),
    ]
})
export class KnockListComponent implements OnInit, OnDestroy {

    private siteTitle:string;
    user:User;
    contacts = new BehaviorSubject<DncContact[]>(null);
    displayColumns = ['checked', 'name', 'address', 'notes'];
    dataSource:MatTableDataSource<DncContact>;
    
    selection:SelectionModel<DncContact>;
    isFabOpen$ = new BehaviorSubject<boolean>(false);

    constructor(
        private route:ActivatedRoute, 
        private session:SessionService, 
        private dialog:MatDialog, 
        private service:KnockListService,
        private message:MessageService,
        private sheet:MatBottomSheet
    ) { }

    ngOnInit() {
        this.contacts.next(this.route.snapshot.data['contacts'].sort(this.sortContacts));
        this.dataSource = new MatTableDataSource<DncContact>(this.contacts.getValue());

        this.session.getUserItem().subscribe(user => {
            this.user = user;

            this.siteTitle = this.session.navigationTitle$.getValue();
            this.session.setNavigationTitle('Contact Manager');

            this.selection = new SelectionModel<DncContact>(true, []);
        });
    }

    ngOnDestroy() {
        this.session.setNavigationTitle(this.siteTitle);
    }

    selectAllToggle() {
        this.isAllSelected() ?
            this.selection.clear() : 
            this.dataSource.data.forEach(r => this.selection.select(r));
    }

    checkboxLabel(row?:DncContact) {
        if (!row) {
            return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
        } 
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'}`;
    }

    isAllSelected() {
        return this.selection.selected.length === this.dataSource.data.length;
    }

    addDncContact() {
        this.dialog.open(AddDncContactDialogComponent, {
            width: '50vw',
            minHeight: '50vh'
        })
        .afterClosed()
        .subscribe((result:DncContact) => {
            if (result == null) return;
            this.session.showLoader();

            result.clientId = this.user.sessionUser.sessionClient;
            this.service.saveNewDncContact(result)
                .subscribe(dnc => {
                    this.session.hideLoader();

                    const updatedList = this.contacts.getValue();
                    updatedList.push(dnc);
                    this.contacts.next(updatedList.sort(this.sortContacts));
                    this.message.addMessage('Saved new DNK Contact!', 'dismiss', 2500);
                });
        });
    }

    deleteDncContacts() { 
        this.sheet.open(ConfirmDeleteSheetComponent, {
            closeOnNavigation: true
        })
        .afterDismissed()
        .subscribe(res => {
            if (res == null) return;

            // delete selected contacs here... 
        });
    }

    sortContacts(a:DncContact, b:DncContact):number {
        const aField = a.lastName ? a.lastName : a.firstName ? a.firstName : a.description;
        const bField = b.lastName ? b.lastName : b.firstName ? b.firstName : b.description;
        if (aField < bField) return -1;
        if (aField > bField) return 1;
        return 0;
    }

}
