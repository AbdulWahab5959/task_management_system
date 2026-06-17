<?php

namespace App\Models;

use App\Traits\UsesTenantConnection;
use Illuminate\Database\Eloquent\Model;

class TenantSetting extends Model
{
    use UsesTenantConnection;

    protected $table = 'tenant_settings';

    protected $fillable = [
        'key',
        'value',
        'type',
    ];

    public function getValueAttribute($value)
    {
        switch ($this->type) {
            case 'integer':
                return (int) $value;
            case 'boolean':
                return (bool) $value;
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }

    public function setValueAttribute($value)
    {
        $this->attributes['value'] = is_array($value) || is_object($value) 
            ? json_encode($value) 
            : $value;
    }
}
