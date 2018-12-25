<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 8/22/18
 * Time: 11:11 PM
 */

namespace App\Http\Services;


use App\DailySale;
use App\Http\Helpers;
use App\Http\Resources\ApiResource;
use App\Remark;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DailySaleService {

	protected $helper;
	protected $saleStatusService;

	public function __construct(Helpers $_helper, SalesStatusService $sales_status_service)
	{
		$this->helper = $_helper;
		$this->saleStatusService = $sales_status_service;
	}

	/**
	 * @param $clientId
	 * @param $campaignId
	 * @param $startDate
	 * @param $endDate
	 *
	 * @return ApiResource
	 */
	public function getDailySalesByClientId($clientId, $campaignId, $startDate, $endDate)
	{
		$result = new ApiResource();
		$startDate = Carbon::createFromFormat('Y-m-d', $startDate)->toDateString();
		$endDate = Carbon::createFromFormat('Y-m-d', $endDate)->toDateString();
		return $result
			->setData(DailySale::byClient($clientId)
				->byCampaign($campaignId)
                ->byDateRange($startDate, $endDate)
                ->filterPaid()
				->with(['remarks', 'remarks.user'])
	            ->get());
	}

    /**
     * Get daily sales entities scoped to client, campaign and pay cycle. 
     *
     * @param $clientId int
     * @param $payCycleId int
     * @param $campaignId int
     * @return ApiResource
     */
    public function getSalesByPayCycle($clientId, $payCycleId, $campaignId)
    {
        $result = new ApiResource();
        return $result->setData(
            DailySale::with('payCycle')
                ->byClient($clientId)
                ->byCampaign($campaignId)
                ->byPayCycle($payCycleId)
                ->get()
        );
    }

	/**
	 * @param $agentId
	 * @param $startDate
	 * @param $endDate
	 *
	 * @return ApiResource
	 */
	public function getDailySalesByAgent($agentId, $startDate, $endDate)
	{
		$result = new ApiResource();
		$startDate = Carbon::createFromFormat('Y-m-d', $startDate)->toDateString();
		$endDate = Carbon::createFromFormat('Y-m-d', $endDate)->toDateString();
		return $result->setData(DailySale::byAgentId($agentId)
			->byDateRange($startDate, $endDate)
            ->filterPaid()
			->with(['remarks', 'remarks.user'])
			->get());
	}

	/**
	 * Save a new daily sale entity.
	 *
	 * @param $sale
	 *
	 * @return ApiResource
	 */
	public function saveNewDailySale($sale)
	{
		$result = new ApiResource();

		if($sale->status === -1)
		{
			$sale->status = $this->saleStatusService
				->createPendingStatus($sale->clientId)
				->getData()
				->status;
		}

        if(!is_object($sale))
            $sale = (object)$sale;

		$s = new DailySale;
		$s->agent_id = $sale->agentId;
		$s->client_id = $sale->clientId;
		$s->campaign_id = $sale->campaignId;
        $s->utility_id = $sale->utilityId;
        $s->contact_id = $sale->contactId;
		$s->pod_account = $sale->podAccount;
		// $s->first_name = $sale->firstName;
		// $s->last_name = $sale->lastName;
		// $s->street = $sale->street;
		// $s->street2 = $sale->street2;
		// $s->city = $sale->city;
		// $s->state = $sale->state;
		// $s->zip = $sale->zip;
		$s->status = $sale->status;
		$s->paid_status = $sale->paidStatus;
		$s->paid_date = $sale->paidDate;
		$s->charge_date = $sale->chargeDate;
		$s->repaid_date = $sale->repaidDate;
		$s->sale_date = $sale->saleDate;
		$s->last_touch_date = Carbon::now();
		$s->updated_at = Carbon::now();
		$s->created_at = Carbon::now();

		$saved = $s->save();

		if(!$saved) return $result->setToFail();

		if ($sale->paidDate != null)
		{
			$dt = new Carbon($s->paid_date);
			$dt = $dt->toFormattedDateString();
			$r = new Remark;
			$r->description = 'Paid ' . $dt;
			$r->modified_by = Auth::user()->id;
			$r->save();
			$s->remarks()->attach($r);
		}

		if ($sale->chargeDate != null)
		{
			$dt = new Carbon($s->charge_date);
			$dt = $dt->toFormattedDateString();
			$r = new Remark;
			$r->description = 'Paid ' . $dt;
			$r->modified_by = Auth::user()->id;
			$r->save();
			$s->remarks()->attach($r);
		}

		if($sale->repaidDate != null)
		{
			$dt = new Carbon($s->repaid_date);
			$dt = $dt->toFormattedDateString();
			$r = new Remark;
			$r->description = 'Paid ' . $dt;
			$r->modified_by = Auth::user()->id;
			$r->save();
			$s->remarks()->attach($r);
		}

		if($saved)
			return $result->setData($s);
		else
			return $result->setToFail();
	}

	/**
	 * @param $sale
	 *
	 * @return ApiResource
	 */
	public function updateDailySale($sale)
	{
		$result = new ApiResource();

		$c = DailySale::byDailySale($sale->dailySaleId)->first();

		if($c == null)
			return $result->setToFail();

		$c->agent_id = $sale->agentId;
        $c->client_id = $sale->clientId;
		$c->campaign_id = $sale->campaignId;
		$c->pod_account = $sale->podAccount;
		// $c->first_name = $sale->firstName;
		// $c->last_name = $sale->lastName;
		// $c->street = $sale->street;
		// $c->street2 = $sale->street2;
		// $c->city = $sale->city;
		// $c->state = $sale->state;
		// $c->zip = $sale->zip;
		$c->status = $sale->status;
		$c->paid_status = $sale->paidStatus;
		$c->paid_date = $sale->paidDate;
		$c->charge_date = $sale->chargeDate;
		$c->repaid_date = $sale->repaidDate;
		$c->sale_date = $sale->saleDate;
		$c->last_touch_date = Carbon::now();

		$success = $c->save();

		if(!$success) return $result->setToFail();

		foreach($sale->remarks as $remark)
		{
			$r = new Remark;
			$r->description = $remark['description'];
			$r->modified_by = $remark['modifiedBy'];
			$r->save();
			$r->dailySale()->attach($c);
		}

		return $result->setData(
			DailySale::with('remarks.user')
			         ->byDailySale($sale->dailySaleId)
                     ->filterPaid()
			         ->first());
	}

	/**
	 * @param $dailySaleId
	 *
	 * @return ApiResource
	 */
	public function deleteDailySale($dailySaleId)
	{
		$result = new ApiResource();

		$sale = DailySale::byDailySale($dailySaleId)->first();
		$deleted = $sale->delete();

		if($deleted)
			return $result->setToSuccess();
		else
			return $result->setToFail();
	}

}