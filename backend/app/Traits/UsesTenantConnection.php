<?php

namespace App\Traits;

trait UsesTenantConnection
{
    public function getConnectionName()
    {
        return 'tenant';
    }
}
