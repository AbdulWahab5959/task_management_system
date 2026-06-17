<?php

namespace App\Models;

use App\Traits\UsesTenantConnection;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    use UsesTenantConnection;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'path',
        'mime_type',
        'size',
        'uploaded_by',
    ];
}
