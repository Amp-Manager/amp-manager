<?php
// Dashboard - Environment Diagnostics for local dev
// Outputs: Angie version, PHP + top extensions, PHP limits, MariaDB info and connection test

// Configuration shown here mirrors docker-compose defaults
// if you customize database credentials edit here:
$db_host = 'db';
$db_port = 3306;
$root_user = 'root';
$root_pass = 'rootpass123';
$app_user = 'ampuser';
$app_pass = 'ampass456';
$app_db   = 'ampdb';

// Angie and PHP
$php_version = phpversion();

// SERVER_SOFTWARE to detect Angie version
if (isset($_SERVER['SERVER_SOFTWARE'])) {
    $serverSoftware = $_SERVER['SERVER_SOFTWARE'];
    $angie_version = "Server software: " . $serverSoftware;

    // Extract Angie version if present
    if (stripos($serverSoftware, 'Angie') !== false) {
        preg_match('/Angie\/([\d\.]+)/i', $serverSoftware, $matches);
        if (!empty($matches[1])) {
            $angie_version .= "\nAngie server version: " . $matches[1];
        } else {
            $angie_version .= "\nAngie server detected, but version not found.";
        }
    } else {
        $angie_version .= "\nNot running on Angie server.";
    }
} else {
    $angie_version = 'SERVER_SOFTWARE variable not available; run: docker compose exec angie angie -v';
}

// Common PHP extensions
$important_ext = [
  'mysqli', 'pdo_mysql', 'json', 'zip', 'curl',
  'mbstring', 'gd', 'intl', 'xml', 'openssl'
];

// PHP limits
$memory_limit = ini_get('memory_limit') ?: 'unknown';
$upload_max_filesize = ini_get('upload_max_filesize') ?: 'unknown';

// MariaDB version check: try user first, then root
$mariadb_version = null;
$mariadb_connect_msg = '';
function try_mariadb_version($host, $port, $user, $pass) {
  $mysqli = @new mysqli($host, $user, $pass, '', $port);
  if ($mysqli && !$mysqli->connect_error) {
    $res = $mysqli->query('SELECT VERSION() AS v');
    if ($res) {
      $row = $res->fetch_assoc();
      $mysqli->close();
      return $row['v'] ?? 'unknown';
    }
    $mysqli->close();
    return 'connected but version query failed';
  }
  return false;
}

$ver = try_mariadb_version($db_host, $db_port, $app_user, $app_pass);
if ($ver !== false) {
  $mariadb_version = $ver;
  $mariadb_connect_msg = "Connected as app user ($app_user)";
} else {
  $ver2 = try_mariadb_version($db_host, $db_port, $root_user, $root_pass);
  if ($ver2 !== false) {
    $mariadb_version = $ver2;
    $mariadb_connect_msg = "Connected as root ($root_user)";
  } else {
    $mariadb_version = 'Not reachable / credentials invalid';
    $mariadb_connect_msg = 'Connection failed with ampuser and root';
  }
}

// Helper emoji status
function status_emoji($ok) { return $ok ? '✅' : '❌'; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Docker Stack Dashboard</title>
  <style>
    :root {
        --bg: hsl(227 25% 15%);
        --text: hsl(227 25% 80%);
        --link: hsl(0, 0%, 95%);
        --primary: hsl(227, 90%, 65%);
        --card-bg: hsl(227 25% 14%);
        --card-border: hsl(227 25% 25%);
        --border: hsl(227 25% 30%);
        --blue: hsl(227, 90%, 54%);
        --green: hsl(85 55% 55%);
        --red: hsl(0 84% 60%);
        --muted: hsl(227 25% 50%);
        --header-height: 60px;
    }

    * { margin:0; padding:0; box-sizing:border-box; }
    html {
        scroll-behavior: smooth;
    }
    body {
        
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
       max-width: 900px;
      margin: 40px auto;
    }
    a:link, a:visited {
        color: var(--link);
        text-decoration: none;
    }   
    a:hover, a:active {
        color: var(--primary);
    }
    h1, h2 {
      color: var(--primary);
      padding-bottom: 1rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      padding: 24px;
      margin: 24px 0;
    }
    button {
      background: hsl(227 25% 20%);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      color: var(--link);
      font-size: 0.95rem;
      padding: 0.25rem 0.5rem;      
    }
    button:hover {
      color: var(--primary);
    }

    
    pre {
      background:hsl(227 25% 10%);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-family:monospace;
      line-height: 1.5;
    }


    .info-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 16px 24px;
      margin: 16px 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 16px 24px;
      margin: 16px 0;
    }
    .label {
      font-weight: bold;
    }
    .value {
      background: hsl(227 25% 18%);    
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-family: 'Courier New', monospace;
      margin: 0.4rem 0;
      padding: 0.6rem;
    }
    .tip {    
    background: hsl(115, 24%, 13%);
    border: 1px solid hsl(227 25% 15%);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
    }
    .tip > p > strong {
        background: hsla(115, 100%, 25%, 0.5);
        border-radius: 0.5rem;
        color: hsl(115, 80%, 50%);
        padding: 0.125rem 0.875rem;
    }
    .success { 
      color: hsl(145, 63%, 42%); 
      font-weight: bold; 
      padding: 0.25rem 1rem;
    }
    .error { 
      color: hsl(6, 78%, 57%);
      font-weight: bold;
      padding: 0.25rem 1rem;
    }
    footer {
      margin-top: 60px;
      text-align: center;
      font-size: 0.9em;
    }
  </style>
</head>
<body>

  <h1>Domain - <?= $_SERVER['HTTP_HOST'] ?></h1>

  <div class="card">
    <h2>Core Components</h2>
    <div class="info-grid">
      <div class="label">PHP Version</div>
      <div class="value"><?= htmlspecialchars($php_version) ?></div>

      <div class="label">Angie Version</div>
      <div class="value">
        <?= htmlspecialchars(trim($angie_version)) ?>
        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <code id="angie-cmd">docker compose exec angie angie -v</code>
          <button onclick="copyToClipboard('#angie-cmd')">Copy</button>
        </div>
      </div>


      <div class="label">MariaDB / MySQL Version</div>
      <div class="value">
        <?php if (strpos($mariadb_version, 'Not reachable') === false): ?>
          <span class="success"><?= status_emoji(true) ?> <?= htmlspecialchars($mariadb_version) ?></span>
        <?php else: ?>
          <span class="error"><?= status_emoji(false) ?> <?= htmlspecialchars($mariadb_version) ?></span>
        <?php endif; ?>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>PHP Extensions</h2>
    <div class="info-grid">
      <div class="label">Extension</div>
      <div class="label">Status</div>
      <?php foreach ($important_ext as $ext): ?>
        <div class="label"><?= htmlspecialchars($ext) ?></div>
        <div class="value"><?= status_emoji(extension_loaded($ext)) ?> <?= extension_loaded($ext) ? '<span class="success">enabled</span>' : '<span class="error">disabled</span>' ?></div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="card">
    <h2>PHP Limits</h2>
    <div class="info-grid">
      <div class="label">memory_limit</div>
      <div class="value"><?= htmlspecialchars($memory_limit) ?></div>
      <div class="label">upload_max_filesize</div>
      <div class="value"><?= htmlspecialchars($upload_max_filesize) ?></div>
    </div>
  </div>

  <div class="card">
    <h2>Credentials & Customization</h2>
    <div class="info-grid">
      <div class="label">DB Host</div>
      <div class="value"><?= htmlspecialchars($db_host) ?>:<?= htmlspecialchars($db_port) ?></div>
      <div class="label">App DB / User</div>
      <div class="value"><?= htmlspecialchars($app_db) ?> — <?= htmlspecialchars($app_user) ?> / <?= htmlspecialchars($app_pass) ?></div>
      <div class="label">Root</div>
      <div class="value"><?= htmlspecialchars($root_user) ?> / <?= htmlspecialchars($root_pass) ?></div>
    </div>

    <h2>Connection Test</h2>
<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Trying to connect to {$db_host}:{$db_port} ...<br>";

// If earlier probe found MariaDB reachable, reuse the user that succeeded
if (strpos($mariadb_version, 'Not reachable') === false) {
    $use_user = (strpos($mariadb_connect_msg, 'app user') !== false) ? $app_user : $root_user;
    $use_pass = ($use_user === $app_user) ? $app_pass : $root_pass;

    $conn = @new mysqli($db_host, $use_user, $use_pass, $app_db, $db_port);
    if ($conn && !$conn->connect_error) {
        echo "<p><span style='color:green'>✅ SUCCESS! Connected to MariaDB as " . htmlspecialchars($use_user) . "</span></p>";
        echo "<p><br>Server: " . htmlspecialchars($conn->server_info);
        echo "<br>Database: " . htmlspecialchars($app_db);
        echo "</p>";
        $conn->close();
    } else {
        $err = $conn ? $conn->connect_error : 'mysqli failed to create object';
        echo "<p><span style='color:red'>❌ Connection failed: " . htmlspecialchars($err) . "</span></p>";
    }
} else {
    echo "<p><span style='color:red'>❌ Database not reachable: " . htmlspecialchars($mariadb_connect_msg) . "</span></p>";
}
?>
  <br>
    <div class="tip">
      <p><strong>Tip</strong></p>
      <p style="margin-top:12px">To change these defaults edit <strong>./config/docker-compose.yml</strong> (env) and <strong>./config/db-init</strong> for init scripts. Restart containers after edits: <code>docker compose up -d</code>.</p>
    </div>
  </div>

  <div class="card">
    <h2>Quick Commands (run in terminal at D:\amp)</h2>
    <pre><code>
docker compose ps                  # all services status
docker compose logs db --tail 30   # last MariaDB logs
docker compose exec php php -v     # PHP version inside container
docker compose exec db mariadb -V  # MariaDB version
    </code></pre>
  </div>

<footer>
  AMP • Angie • MariaDB • PHP • CA-SSL<br>
  Test page — safe to delete or replace.
</footer>
<script>
function copyToClipboard(selector){
  try{
    var el = document.querySelector(selector);
    var text = el ? el.innerText : selector;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ alert('Copied: ' + text); });
    } else {
      prompt('Copy command', text);
    }
  } catch(e){
    prompt('Copy command', selector);
  }
}
</script>
</body>
</html>