<?php

namespace App\Models;

use App\Traits\UsesTenantConnection;
use Illuminate\Database\Eloquent\Model;

class ProjectSection extends Model
{
    use UsesTenantConnection;

    protected $fillable = [
        'project_id',
        'name',
        'position',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'section_id');
    }
}
