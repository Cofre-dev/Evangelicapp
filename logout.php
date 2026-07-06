<?php
setcookie('token', '', ['expires' => time() - 3600, 'path' => '/']);
header('Location: index.php');
exit;
