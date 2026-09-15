<?php

namespace App\Models;

use App\Traits\UsesTenantConnection;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use UsesTenantConnection;

    protected $fillable = [
        'name',
        'description',
        'status',
        'start_date',
        'due_date',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
    ];

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
