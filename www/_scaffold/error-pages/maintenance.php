<?php $host = htmlspecialchars($_SERVER['HTTP_HOST'] ?? 'this site'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance | <?= $host ?></title>
    <style>
        body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin:0; padding:0; line-height:1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 4rem 1.5rem; text-align: center; }
        h1 { font-size: 6rem; margin: 0; color: #f59e0b; }
        h2 { font-size: 2.5rem; margin: 1.5rem 0 2rem; }
        p { font-size: 1.3rem; margin-bottom: 2rem; }
        .btn { display: inline-block; padding: 1rem 2.5rem; background: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1.2rem; }
        footer { margin-top: 6rem; color: #64748b; font-size: 0.95rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Maintenance</h1>
        <h2>We'll be back soon</h2>
        <p><strong><?= $host ?></strong> is currently undergoing scheduled maintenance.</p>
        <p>Expected back online shortly — thank you for your patience.</p>

        <a href="/" class="btn">Check again later</a>

        <footer>
            AMP • Angie • MariaDB • PHP • © <?= date('Y') ?> gigamaster • <?= $host ?>
        </footer>
    </div>
</body>
</html>