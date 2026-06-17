<?php

namespace App\Models;

use App\Traits\UsesTenantConnection;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use UsesTenantConnection;

    protected $fillable = [
        'name',
        'description',
        'status',
        'created_by',
    ];

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }
}
