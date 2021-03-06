import {Component, OnInit} from '@angular/core';
import {DailySale, IAgent, SaleStatus, User, ICampaign, Remark, PaidStatusType} from '@app/models';

import * as moment from 'moment';
import * as _ from 'lodash';
import {AgentsService} from '@app/core/agents/agents.service';
import {MessageService} from '@app/message.service';
import {Observable, of, BehaviorSubject, zip, forkJoin} from 'rxjs';
import {DataSource} from '@angular/cdk/table';
import {ClientService} from '@app/client-information/client.service';
import {UserService} from '@app/user-features/user.service';
import {DailySaleTrackerService} from './daily-sale-tracker.service';
import {MatDatepickerInputEvent, MatDialog, MatSelectChange} from '@angular/material';
import {Moment} from 'moment';
import {AddSaleDialog} from '@app/daily-sale-tracker/dialogs/add-sale.component';
import {CampaignService} from '@app/campaigns/campaign.service';
import {States, IState} from '@app/shared/models/state.model';
import {FormGroup, FormBuilder, FormArray, Validators, FormControl} from '@angular/forms';
import {DeleteSaleDialog} from '@app/daily-sale-tracker/dialogs/delete-sale.component';
import {trigger, style, state, transition, animate} from '@angular/animations';
import {FloatBtnService} from '@app/fab-float-btn/float-btn.service';

interface DataStore {
    statuses: SaleStatus[];
    sales: DailySale[];
}

interface PaidStatus {
    id: number | string;
    name: string;
}

@Component({
    selector: 'vs-daily-sale-tracker',
    templateUrl: './daily-sale-tracker.component.html',
    styleUrls: ['./daily-sale-tracker.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({height: '0px', minHeight: '0', display: 'none'})),
            state('expanded', style({height: '*'})),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
        ])
    ],
    providers: [FloatBtnService]
})
export class DailySaleTrackerComponent implements OnInit {
    paidStatusOptions: PaidStatus[] = [
        {id: 0, name: 'Unpaid'},
        {id: 1, name: 'Paid'},
        {id: 2, name: 'Chargeback'},
        {id: 3, name: 'Repaid'}
    ];
    states: IState[] = States.$get();
    displayColumns: string[] = [
        'saleDate',
        'agentId',
        'podAccount',
        'firstName',
        'lastName',
        'status',
        'paidStatus',
        'activityDate',
        'save'
    ];

    private store: DataStore = {
        statuses: null,
        sales: null
    };

    userInfo: User;
    dataSource$: BehaviorSubject<DailySale[]> = new BehaviorSubject<DailySale[]>(null);
    sales: Observable<DailySale[]>;
    agents: IAgent[];
    startDate: moment.Moment;
    endDate: moment.Moment;
    statuses: BehaviorSubject<SaleStatus[]> = new BehaviorSubject<SaleStatus[]>(null);
    campaigns: ICampaign[];
    selectedCampaign: ICampaign;
    tableEmpty: boolean;
    floatIsOpen: Observable<boolean>;
    form: FormGroup;
    expandedElement: DailySale;
    showNotes: boolean = false;

    constructor(
        private agentService: AgentsService,
        private clientService: ClientService,
        private campaignService: CampaignService,
        private userService: UserService,
        private msg: MessageService,
        private trackerService: DailySaleTrackerService,
        private dialog: MatDialog,
        private fb: FormBuilder,
        private floatBtnService: FloatBtnService
    ) {
        /** why are we doing this? why not just use an observable w/async pipe to dataSource$? */
        this.dataSource$.subscribe(next => {
            if (next == null) return;
            this.sales = of(next);
        });
        this.floatIsOpen = this.floatBtnService.opened$.asObservable();
    }

    ngOnInit() {
        this.createForm();
        this.startDate = moment().add(-1, 'd');
        this.endDate = moment();

        this.userService.user.subscribe(u => {
            this.userInfo = u;

            forkJoin(
                this.clientService.getSaleStatuses(this.userInfo.sessionUser.sessionClient),
                this.campaignService.getCampaigns(this.userInfo.sessionUser.sessionClient)
            ).subscribe(([saleStatuses, campaigns]) => {
                this.store.statuses = saleStatuses;
                this.statuses.next(saleStatuses);

                this.campaigns = _.sortBy(campaigns, ['name']);
                this.campaigns.unshift({
                    campaignId: 0,
                    clientId: this.userInfo.sessionUser.sessionClient,
                    name: 'All Campaigns',
                    active: true
                });

                if(this.campaigns.length) {
                    this.selectedCampaign = this.campaigns[0];
                } else {
                    this.selectedCampaign = {
                        campaignId: 0,
                        clientId: null,
                        name: null,
                        active: false
                    }
                }

                this.refreshDailySales(this.startDate, this.endDate);
            });
        });

        this.agentService
            .getAgents(true)
            .then(agents => {
                this.agents = agents;
            })
            .catch(this.msg.showWebApiError);
    }

    handleDateChange($event: MatDatepickerInputEvent<Moment>, isStartDate: boolean): void {
        const mDate = $event.value;

        if (isStartDate) {
            this.startDate = mDate;
        } else {
            this.endDate = mDate;
        }

        const start = this.startDate;
        const end = this.endDate;

        this.refreshDailySales(start, end);
    }

    expandedRowHover(row: any): void {
        row.showNotes = row.showNotes == null ? true : !row.showNotes;
        this.showNotes = !this.showNotes;
        row = this.showNotes ? row : null;
        setTimeout(() => {
            this.expandedElement = row;
        }, 250);
    }

    showAddSaleDialog(): void {
        this.floatBtnService.open();
        this.dialog
            .open(AddSaleDialog, {
                width: '800px',
                data: {
                    statuses: this.store.statuses,
                    agents: this.agents,
                    selectedCampaign: this.selectedCampaign,
                    campaigns: this.campaigns,
                    user: this.userInfo
                }
            })
            .afterClosed()
            .subscribe((result: any) => {
                this.floatBtnService.close();
                if (result == null) return;
                let dto: DailySale = result;
                dto.clientId = this.userInfo.sessionUser.sessionClient;
                dto.saleDate = this.formatSqlDate(dto.saleDate as Moment, true);

                this.trackerService.createDailySale(dto.clientId, dto).subscribe(() => {
                    this.refreshDailySales(this.startDate, this.endDate);
                });
            });
    }

    changeSelectedCampaignId(event: MatSelectChange): void {
        this.selectedCampaign = _.find(this.campaigns, {campaignId: event.value}) as ICampaign;

        this.refreshDailySales(this.startDate, this.endDate);
    }

    castString(value: any): string {
        return value + '';
    }

    formatSqlDate(date: Moment, withTimestamp: boolean = false): string {
        if (withTimestamp) return date.format('YYYY-MM-DD HH:mm:ss');
        return date.format('YYYY-MM-DD');
    }

    getFormGroup(name: string, index: number): FormGroup {
        return this.form.get(name).get(index + '') as FormGroup;
    }

    getSalesControl(name: string, index: number): FormControl {
        return this.form
            .get('sales')
            .get(index + '')
            .get(name) as FormControl;
    }

    updateExistingSalesRow(index: number): void {
        const sale: FormGroup = this.form.get('sales').get(index + '') as FormGroup;

        // if the user chose a paid status of "unpaid", let's call the method to handle this
        // which simply unsets the activity date
        if (sale.value.paidStatus == PaidStatusType.unpaid) this.handleUnpaidSaleStatus(index);

        let dto = this.prepareModel(sale, index);

        let changeType, changeDate;
        switch (sale.value.paidStatus) {
            case PaidStatusType.chargeback:
                changeType = 'Chargeback';
                changeDate = dto.chargeDate;
                break;
            case PaidStatusType.paid:
                changeType = 'Paid';
                changeDate = dto.paidDate;
                break;
            case PaidStatusType.repaid:
                changeType = 'Repaid';
                changeDate = dto.repaidDate;
                break;
            case PaidStatusType.unpaid:
            default:
                changeType = 'Unpaid';
                changeDate = null;
                break;
        }

        if (sale.value.paidStatus != PaidStatusType.unpaid) {
            let changeDateTime = moment().toString();
            let formattedChangeDate: string = moment(changeDate).format('MM-DD-YYYY');
            let changeAgent = this.userInfo.firstName + ' ' + this.userInfo.lastName;
            let remark = `Paid status was changed to: ${changeType} (${formattedChangeDate}) on ${changeDateTime} by: ${changeAgent}.`;

            dto.remarks.push({
                remarkId: null,
                dailySaleId: dto.dailySaleId,
                description: remark,
                modifiedBy: this.userInfo.id
            });
        }

        this.trackerService.updateDailySale(dto.clientId, dto).subscribe(result => {
            this.store.sales[index] = result;
            this.patchFormSaleValue(result, index);
            this.msg.addMessage('Saved!', 'dismiss', 3000);
        });
    }

    private handleUnpaidSaleStatus(index: number): void {
        (<FormControl>this.form.get('sales').get(index + '')).patchValue({
            activityDate: null
        });
    }

    showEditSaleDialog(index: number): void {
        // this was checking form validity when we were completing the entire form right in the table
        // but don't think i need this anymore
        // const sale:FormGroup = this.form.get('sales').get(index+'') as FormGroup;
        // if (sale.invalid) return;

        let dto = this.store.sales[index];

        let campaign:ICampaign;
        if(this.selectedCampaign.campaignId < 1) {
            campaign = _.find(this.campaigns, {campaignId: dto.campaignId});
        } else {
            campaign = this.selectedCampaign;
        }

        this.dialog
            .open(AddSaleDialog, {
                width: '800px',
                data: {
                    agents: this.agents,
                    selectedCampaign: campaign,
                    sale: dto,
                    statuses: this.store.statuses,
                    campaigns: this.campaigns,
                    user: this.userInfo
                }
            })
            .afterClosed()
            .subscribe(dto => {
                if (dto == null) return;

                this.trackerService.updateDailySale(this.userInfo.sessionUser.sessionClient, dto).subscribe(sale => {
                    this.store.sales[index] = sale;
                    // this.patchFormSaleValue(sale, index);
                    this.refreshDailySales(this.startDate, this.endDate);
                    this.msg.addMessage('Saved!', 'dismiss', 3000);
                });
            });
    }

    deleteSale(index: number): void {
        const sale: FormGroup = this.form.get('sales').get(index + '') as FormGroup;

        if (this.showNotes) this.expandedRowHover(null);

        this.dialog
            .open(DeleteSaleDialog, {
                width: '300'
            })
            .afterClosed()
            .subscribe(result => {
                if (result == null) return;
                const dto: DailySale = this.prepareModel(sale, index);
                if (dto.dailySaleId < 1) return;
                this.trackerService
                    .deleteDailySale(this.userInfo.sessionUser.sessionClient, dto.dailySaleId)
                    .subscribe(() => {
                        this.msg.addMessage('Successfully deleted sale.', 'dismiss', 3000);
                        this.refreshDailySales(this.startDate, this.endDate);
                    });
            });
    }

    getAgentName(agentId: number): string {
        const agent = _.find(this.agents, {agentId: agentId}) as IAgent;
        return agent.firstName + ' ' + agent.lastName;
    }

    getSaleStatus(statusId: number): SaleStatus {
        return (_.find(this.statuses.getValue(), {saleStatusId: statusId}) || {id: statusId, name: null}) as SaleStatus;
    }

    getPaidStatus(paidStatusId: number): PaidStatus {
        return _.find(this.paidStatusOptions, {id: paidStatusId}) as PaidStatus;
    }

    private refreshDailySales(startDate: Moment, endDate: Moment): void {
        let startRange = startDate.clone();
        let endRange = endDate.clone();
        startRange = startRange.add(-1, 'd');
        endRange = endRange.add(1, 'd');

        this.trackerService
            .getDailySalesByDate(
                this.userInfo.sessionUser.sessionClient,
                this.selectedCampaign.campaignId,
                this.formatSqlDate(startRange),
                this.formatSqlDate(endRange)
            )
            .subscribe(sales => {
                this.store.sales = _.orderBy(sales, ['saleDate'], ['desc']);
                this.tableEmpty = sales.length < 1;
                this.dataSource$.next(this.store.sales);
                this.createForm();
            });
    }

    private createForm(): void {
        this.form = this.fb.group({
            sales: this.createSalesFormArray()
        });
    }

    private createSalesFormArray(): FormArray {
        if (this.store.sales == null || this.store.sales.length < 1) return this.fb.array([]);
        let result: FormArray = this.fb.array([]);
        for (let i = 0; i < this.store.sales.length; i++) {
            const d = this.store.sales[i];
            result.push(
                this.fb.group({
                    dailySaleId: this.fb.control(d.dailySaleId || ''),
                    agent: this.fb.control(d.agentId || '', [Validators.required]),
                    account: this.fb.control(d.podAccount || '', [Validators.required]),
                    firstName: this.fb.control(d.firstName || '', [Validators.required]),
                    lastName: this.fb.control(d.lastName || '', [Validators.required]),
                    street: this.fb.control(d.street || '', [Validators.required]),
                    street2: this.fb.control(d.street2 || ''),
                    city: this.fb.control(d.city || '', [Validators.required]),
                    state: this.fb.control(d.state || '', [Validators.required]),
                    zip: this.fb.control(d.zip || '', [Validators.required]),
                    status: this.fb.control(d.status || '', [Validators.required]),
                    paidStatus: this.fb.control(d.paidStatus, [Validators.required]),
                    saleDate: this.fb.control(d.saleDate || '', [Validators.required]),
                    activityDate: this.fb.control(this.calculateActivityDate(d)),
                    remarks: this.createRemarksFormArray(d.remarks)
                })
            );
        }
        return result;
    }

    private calculateActivityDate(sale: DailySale): Date | string | Moment {
        let activityDate: Date | string | Moment;

        switch (sale.paidStatus) {
            case PaidStatusType.paid:
                activityDate = sale.paidDate;
                break;
            case PaidStatusType.chargeback:
                activityDate = sale.chargeDate;
                break;
            case PaidStatusType.repaid:
                activityDate = sale.repaidDate;
                break;
            case PaidStatusType.unpaid:
            default:
                activityDate = null;
                break;
        }

        return activityDate;
    }

    private setActivityDateProperty(
        formPaidStatus: PaidStatusType,
        modelField: string,
        index: number
    ): Date | string | Moment {
        let actMo = moment(this.form.value.sales[index].activityDate);
        if (modelField == 'paidDate' && formPaidStatus == PaidStatusType.paid && actMo.isValid()) {
            return moment(this.form.value.sales[index].activityDate).format('YYYY-MM-DD');
        } else if (modelField == 'chargeDate' && formPaidStatus == PaidStatusType.chargeback && actMo.isValid()) {
            return moment(this.form.value.sales[index].activityDate).format('YYYY-MM-DD');
        } else if (modelField == 'repaidDate' && formPaidStatus == PaidStatusType.repaid && actMo.isValid()) {
            return moment(this.form.value.sales[index].activityDate).format('YYYY-MM-DD');
        }
        return this.store.sales[index][modelField] || null;
    }

    private createRemarksFormArray(remarks: Remark[]): FormArray {
        let result = this.fb.array([]);
        remarks.forEach(r => {
            result.push(this.fb.control(r.description || '', [Validators.required]));
        });
        return result;
    }

    private patchFormSaleValue(sale: DailySale, index: number): void {
        this.form
            .get('sales')
            .get(index + '')
            .patchValue({
                dailySaleId: sale.dailySaleId,
                agent: sale.agentId,
                account: sale.podAccount,
                firstName: sale.firstName,
                lastName: sale.lastName,
                street: sale.street,
                street2: sale.street2,
                city: sale.city,
                state: sale.state,
                zip: sale.zip,
                status: sale.status,
                paidStatus: +sale.paidStatus,
                activityDate: this.calculateActivityDate(sale),
                saleDate: sale.saleDate,
                remarks: sale.remarks
            });
    }

    private prepareModel(form: FormGroup, index: number = null): DailySale {
        return {
            dailySaleId: form.value.dailySaleId,
            agentId: form.value.agent,
            campaignId: this.resolveClientId(index),
            clientId: this.userInfo.sessionUser.sessionClient,
            firstName: form.value.firstName,
            lastName: form.value.lastName,
            street: form.value.street,
            street2: form.value.street2,
            city: form.value.city,
            state: form.value.state,
            zip: form.value.zip,
            status: form.value.status,
            paidStatus: form.value.paidStatus,
            paidDate: this.setActivityDateProperty(form.value.paidStatus, 'paidDate', index),
            chargeDate: this.setActivityDateProperty(form.value.paidStatus, 'chargeDate', index),
            repaidDate: this.setActivityDateProperty(form.value.paidStatus, 'repaidDate', index),
            remarks: this.prepareRemarks(index),
            saleDate: form.value.saleDate,
            podAccount: form.value.account
        };
    }

    private resolveClientId(saleIndex: number): number {
        if (this.selectedCampaign.campaignId > 0) return this.selectedCampaign.campaignId;
        return this.store.sales[saleIndex].campaignId;
    }

    private prepareRemarks(index): Remark[] {
        var result: Remark[] = [];
        if (this.form.value.remarks == null) return [];
        this.form.value.remarks.forEach((r: string) => {
            result.push({
                remarkId: null,
                dailySaleId: this.store.sales[index].dailySaleId,
                description: r,
                modifiedBy: this.userInfo.id
            });
        });
        return result;
    }
}


