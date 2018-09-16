import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignsComponent } from './campaigns.component';
import { MaterialModule } from '@app/material/material.module';
import { NewCampaignDialogComponent } from './new-campaign-dialog/new-campaign-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { FabFloatBtnModule } from '@app/fab-float-btn/fab-float-btn.module';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    BrowserModule,
    FabFloatBtnModule
  ],
  declarations: [
    CampaignsComponent,
    NewCampaignDialogComponent
  ],
  entryComponents: [
    NewCampaignDialogComponent
  ]
})
export class CampaignsModule { }
