import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';

import { IUser, IUserDetail, IWeather, IOnboarding, IClient, ICampaign } from '../models';

import * as moment from 'moment';

import { WeatherService } from '../weather.service';
import { UserService } from '../user-features/user.service';
import { MessageService } from '../message.service';

import { LoadingSpinnerService } from '../loading-spinner/loading-spinner.service';
import { CampaignService } from '../campaigns/campaign.service';
import { SessionService } from '../session.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'my-information',
  templateUrl: './my-information.component.html',
  styleUrls: ['./my-information.component.scss']
})
export class MyInformationComponent implements OnInit {
  user: IUser;
  user$:Observable<IUser>;
  detail$:Observable<IUserDetail>;
  detail: IUserDetail = <IUserDetail>{};
  weather: IWeather;
  minTemp: string;
  maxTemp: string;
  editProfile: boolean = false;
  editDetails: boolean;
  joinDate: string;
  welcome: string;
  hasOnboarding: boolean;
  onboarding: IOnboarding;

  client: IClient = <IClient>{};

  ssn: string = '123456789';

  campaigns: ICampaign[] = [];
  allCampaigns:ICampaign[] = [];

  constructor(
    private weatherApi: WeatherService,
    private userService: UserService,
    private msg: MessageService,
    private spinner: LoadingSpinnerService,
    private campaignService:CampaignService,
    private session: SessionService
  ) {
    this.detail$ = this.userService.userDetail$.asObservable();
    this.user$ = this.userService.user$.asObservable();
  }

  ngOnInit() {
    this.session.showLoader();
    this.user$.subscribe(user => {
      this.user = user;
      this.hasOnboarding = user.selectedClient.options.hasOnboarding;
      this.client = user.selectedClient;
      this.welcome = user.firstName;
      this.joinDate = moment(user.createdAt.date).format('MMMM Do, YYYY');

      this.campaignService.getCampaigns(this.user.selectedClient.clientId)
        .then((campaigns:ICampaign[]) => {
          this.allCampaigns = campaigns;
          this.session.hideLoader();
        })
        .catch(this.msg.showWebApiError);
    });
    // this.session.userItem.subscribe((user:IUser) => {
    //   this.user = user;
    //   this.hasOnboarding = this.user.selectedClient.options.hasOnboarding;
    //   this.client = this.user.selectedClient;

    //   this.welcome = this.user.firstName;
    //   this.joinDate = moment(this.user.createdAt.date).format('MMMM Do, YYYY');

    //   this.campaignService.getCampaigns(this.user.selectedClient.clientId)
    //     .then((campaigns:ICampaign[]) => {
    //       this.allCampaigns = campaigns;
    //       this.session.hideLoader();
    //     })
    //     .catch(this.msg.showWebApiError);
    // });

    // gets user's location from the browser
    navigator.geolocation.getCurrentPosition(pos => {
      this.initWeather(pos.coords.longitude, pos.coords.latitude);
    });
  }

  initWeather(longitude: number, latitude: number): void {
    this.weatherApi.getWeatherByGeoLocale(longitude, latitude)
      .then((result: IWeather) => {
        this.weather = result;
        this.minTemp = this.convertToFahrenheit(this.weather.main.temp_min);
        this.maxTemp = this.convertToFahrenheit(this.weather.main.temp_max);
      });
  }

  convertToFahrenheit(temp: number): string {
    let result = 1.8 * (temp - 273) + 32;
    result = Math.round(result);
    return result + 'F';
  }

  changeEditMode(f: NgForm): void {
    if(!f.dirty) {
      this.editProfile = !this.editProfile;
    } else {
      f.reset();
    }
  }

  changeOnboardingEditMode(f: NgForm): void {
    if(!f.dirty) {
      this.editDetails = !this.editDetails;
    } else {
      f.reset();
    }
  }

  save(f: NgForm) {
    this.spinner.show();
    // if account numbers are null, make them zeros to be inserted into db
    this.formatBankAccountNumbers();

    this.userService.updateUser(this.user, this.detail);
    f.reset();
    this.editProfile = !this.editProfile;
    this.msg.addMessage('Saved successfully.', 'dismiss', 6000);
  }

  // need to finish this
  cancel(f: NgForm): void {
    this.userService.reloadUser();
    this.editProfile = !this.editProfile;
  }

  cancelDetails(f: NgForm): void {
    this.userService.reloadUserDetail();
    this.editDetails = !this.editDetails;
  }

  saveOnboarding(f: NgForm) {
    console.dir(f);
  }

  clearId(saleIdName: string, campaignName: string): void {
    this.detail[saleIdName] = null;
    this.detail[campaignName] = null;
  }

  private resetUserFormFields(f: NgForm, user: any) {
    for(var key in f.value) {
      if(!f.value.hasOwnProperty(key)) continue;
      var obj = f.form.controls[key];
      if(!obj.dirty) continue;
      this.user[key] = user[key];
      obj.markAsUntouched();
    }
  }

  private formatBankAccountNumbers(pageLoad: boolean = false) {
    if(pageLoad) {
      this.detail.bankRouting = (this.detail.bankRouting === 0) ? null : this.detail.bankRouting;
      this.detail.bankAccount = (this.detail.bankAccount === 0) ? null : this.detail.bankAccount;
    } else {
      this.detail.bankRouting = this.detail.bankRouting ? this.detail.bankRouting : 0;
      this.detail.bankAccount = this.detail.bankAccount ? this.detail.bankAccount : 0;
    }
  }

  private setEmptyUserDetail():IUserDetail {
    return {
      userDetailId: null,
      userId: null,
      street: null,
      street2: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      ssn: null,
      birthDate: null,
      bankRouting: null,
      bankAccount: null,
      saleOneId: null,
      saleTwoId: null,
      saleThreeId: null,
      createdAt: null,
      updatedAt: null
    };
  }

}
