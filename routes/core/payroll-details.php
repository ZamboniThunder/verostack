<?php

/**
 * Some of the calls from paycheck.service.ts get caught here... 
 */
Route::middleware(['auth:api'])->group(function() {

    // Route::get('clients/{clientId}/payroll-details/{payrollDetailsId}/expenses-and-overrides', 'PayrollDetailsController@getExpensesAndOverrides')
    //     ->where(['clientId' => '[0-9]+', 'payrollDetailsId' => '[0-9]+']);

    // Route::get('clients/{clientId}/payroll-details/{payrollDetailsId}', 'PayrollDetailController@getPaychecksByDetail')
    //     ->where(['clientId' => '[0-9]+', 'payrollDetailsId' => '[0-9]+']);

    Route::get('clients/{clientId}/payroll-details', 'PayrollDetailController@getPaychecks');

});