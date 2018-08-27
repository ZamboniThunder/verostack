<?php

namespace App\Http\Controllers;

use App\Http\Helpers;
use App\Http\Resources\ApiResource;
use App\Http\Services\DailySaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DailySaleController extends Controller
{
	protected $helper;
	protected $service;

	public function __construct(Helpers $_helper, DailySaleService $_service)
	{
		$this->helper = $_helper;
		$this->service = $_service;
	}

	/**
	 * Get daily sales entities by client id.
	 *
	 * @param $clientId
	 *
	 * @return mixed
	 */
	public function getDailySales($clientId, $startDate, $endDate)
	{
		$result = new ApiResource();

		$result
			->checkAccessByClient($clientId, Auth::user()->id)
			->mergeInto($result);

		if($result->hasError)
			return $result->getResponse();

		return $this->service->getDailySalesByClientId($clientId, $startDate, $endDate)
			->mergeInto($result)
			->throwApiException()
			->getResponse();
	}

	public function createDailySale(Request $request, $clientId)
	{
		$result = new ApiResource();

		$result
			->checkAccessByClient($clientId, Auth::user()->id)
			->mergeInto($result);

		if($result->hasError)
			return $result->getResponse();

		return $this->service->saveNewDailySale($request)
			->mergeInto($result)
			->throwApiException()
			->getResponse();
	}

}
