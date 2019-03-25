import { Component, OnInit } from '@angular/core';
import { ActivatedRouteSnapshot, ActivatedRoute } from '@angular/router';
import { PayrollDetails, User, IClient, DailySale, IOverride, IExpense, Payroll } from '@app/models';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { SessionService } from '@app/session.service';
import { DailySaleTrackerService } from '@app/daily-sale-tracker/daily-sale-tracker.service';
import { AgentService } from '@app/agent/agent.service';
import { PaycheckDetailService } from './paycheck-detail.service';

@Component({
    selector: 'vs-paycheck-detail',
    templateUrl: './paycheck-detail.component.html',
    styleUrls: ['./paycheck-detail.component.scss']
})
export class PaycheckDetailComponent implements OnInit {

    user:User;
    client:IClient;
    detail$ = new BehaviorSubject<PayrollDetails>(null);

    sales:DailySale[];
    saleColumns = ['no', 'saleDate', 'customerName', 'address', 'commissionable', 'amount'];

    overrides:IOverride[];
    overrideColumns = ['agentName', 'noSales', 'commission', 'total'];

    expenses:IExpense[];
    expenseColumns = ['date', 'title', 'description', 'amount'];

    summary:PayrollDetails[];
    summaryColumns = ['spacer', 'titleColumn', 'total'];

    constructor(
        private route:ActivatedRoute, 
        private session:SessionService, 
        private dailySaleService:DailySaleTrackerService,
        private agentService:AgentService,
        private paycheckDetailService:PaycheckDetailService
    ) {}

    ngOnInit() {
        this.route.data.subscribe(data => {
            const detailData:PayrollDetails = data.data;
            this.detail$.next(data.data);
            this.overrides = detailData.overrides;
            this.expenses = detailData.expenses;
            this.summary = [detailData];

            this.initializeComponent(detailData);
        });
    }

    getPrintablePDF() {
        this.session.showLoader();
        this.paycheckDetailService.generatePdf(this.user.sessionUser.sessionClient, this.detail$.getValue().payrollDetailsId)
            .subscribe(result => {
                this.session.hideLoader();
                
                const byteChars = atob(result.data);
                const byteNumbers = [byteChars.length];
                for (let i = 0; i < byteChars.length; i++) {
                    byteNumbers[i] = byteChars.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                const file = new Blob([byteArray], { type: 'application/pdf;base64' });
                const fileUrl = URL.createObjectURL(file);
                window.open(fileUrl);
            });
    }

    private initializeComponent(detailData:PayrollDetails) {
        this.session.getUserItem().subscribe(u => {
            this.user = u;

            /** THIS IS THE HEADLESS PDF LOGIC, THIS IS ONLY GETS HIT FROM PUPPETEER API */
            if (this.user == null) {
                const payload = this.paycheckDetailService.headlessPayload;
                this.user = payload.user;
                this.client = <any>this.user.selectedClient;

                payload.sales.forEach(s => {
                    const pairing = payload.pairings.find(p => p.agentId == s.agentId && s.campaignId == p.campaignId);
                    if (pairing == null || pairing.commission == null) return;
                    s.campaign.compensation = pairing.commission;
                });

                this.sales = payload.sales;

                (<any>document.getElementsByTagName('mat-toolbar')[0]).style.opacity = 0;
                (<any>document.getElementsByClassName('print-button')[0]).style.opacity = 0;
                (<any>document.getElementsByClassName('page-header-accent')[0]).style.borderStyle = 'unset';
                (<any>document.getElementsByClassName('page-header-accent')[0]).style.marginBottom = 0;
                (<any>document.getElementsByClassName('border-top-primary')[0]).style.borderStyle = 'unset';
            } else {
                this.client = this.user.clients.find(c => c.clientId == this.user.sessionUser.sessionClient);

                forkJoin(
                    this.dailySaleService.getPaycheckDetailSales(this.client.clientId, detailData.payroll.payCycleId),
                    this.agentService.getSalesPairingsByClient(this.client.clientId)
                ).subscribe(([sales, pairings]) => {
                    
                    sales.forEach(s => {
                        const pairing = pairings.find(p => p.agentId == s.agentId && s.campaignId == p.campaignId);
                        if (pairing == null || pairing.commission == null) return;
                        s.campaign.compensation = pairing.commission;
                    });
    
                    this.sales = sales;

                    const detail = this.detail$.getValue();
                    if (detail.payroll == null && this.sales.length) {
                        detail.payroll = {
                            campaign: this.sales[0].campaign
                        } as Payroll;
                        this.detail$.next(detail);
                    }
                });
            }
        });
    }
}
