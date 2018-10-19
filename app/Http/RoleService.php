<?php

namespace App\Http;

use App\Role;
use App\Http\Resources\ApiResource;
use App\User;

class RoleService 
{

    public function saveRole($user, $roleId) 
    {
        $result = new ApiResource();

        $curr = Role::userId($user->id)->first();

        if(is_null($curr)) 
        {
            $curr = new Role;
            $curr->user_id = $user->id;
            $curr->role = $roleId;
        }
        else 
        {
            $curr->role = $roleId;
        }

        $saved = $curr->save();

        if(!$saved)
            return $result->setToFail();

        return $result->setData($curr);
    }

}