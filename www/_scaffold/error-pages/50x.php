<?php $host = htmlspecialchars($_SERVER['HTTP_HOST'] ?? 'this site'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Error | <?= $host ?></title>
    <style>
        body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin:0; padding:0; line-height:1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 4rem 1.5rem; text-align: center; }
        h1 { font-size: 7rem; margin: 0; color: #ef4444; }
        h2 { font-size: 2.2rem; margin: 1rem 0 1.5rem; }
        p { font-size: 1.25rem; margin-bottom: 2rem; }
        .btn { display: inline-block; margin: 0.5rem; padding: 0.9rem 2rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .btn:hover { background: #2563eb; }
        footer { margin-top: 5rem; color: #64748b; font-size: 0.95rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>5xx</h1>
        <h2>Server Error</h2>
        <p>Something broke on <strong><?= $host ?></strong>.</p>
        <p>Our team has been notified. Please try again in a few moments.</p>

        <a href="/" class="btn">Back to Home</a>

        <footer>
            AMP • Angie • MariaDB • PHP • © <?= date('Y') ?> gigamaster • <?= $host ?>
        </footer>
    </div>
</body>
</html>