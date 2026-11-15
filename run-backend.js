const net = require("net");
const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const isWin = process.platform === "win32";
const backendDir = path.join(__dirname, "backend");

function checkPort(port, host = "127.0.0.1", timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(timeout);
    socket.once("connect", () => {
      connected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function tryStartPostgres() {
  console.log("\x1b[33m[БД] Проверка подключения к PostgreSQL (порт 5432)...\x1b[0m");
  const isUp = await checkPort(5432);
  if (isUp) {
    console.log("\x1b[32m[БД] PostgreSQL уже запущен и принимает соединения.\x1b[0m");
    return true;
  }

  console.log("\x1b[33m[БД] База данных не отвечает. Пробуем запустить службу PostgreSQL...\x1b[0m");

  // Попытка 1: Запуск службы Windows PostgreSQL (если есть)
  if (isWin) {
    try {
      const psCmd = `Get-Service -Name "postgresql*" | Where-Object { $_.Status -ne "Running" } | Start-Service`;
      execSync(`powershell -Command "${psCmd}"`, { stdio: "ignore" });
    } catch {
      // Игнорируем ошибку, если нет прав админа или служба не найдена
    }
  }

  // Попытка 2: Docker Compose (если установлен)
  try {
    execSync("docker compose up -d", { stdio: "ignore" });
  } catch {
    // Docker не установлен или не запущен
  }

  // Ждём до 8 секунд поднятия порта
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkPort(5432)) {
      console.log("\x1b[32m[БД] PostgreSQL успешно запущен.\x1b[0m");
      return true;
    }
  }

  console.warn("\x1b[31m[БД] Предупреждение: Не удалось автоматически запустить PostgreSQL на порту 5432.\x1b[0m");
  console.warn("\x1b[31m[БД] Убедитесь, что служба PostgreSQL запущена (в Службах Windows или через Docker).\x1b[0m");
  return false;
}

function runMigrations() {
  console.log("\x1b[36m[БД] Проверка и применение миграций базы данных...\x1b[0m");
  const venvPythonWin = path.join(backendDir, "venv", "python.exe");
  const venvAlembicWin = path.join(backendDir, "venv", "Scripts", "alembic.exe");
  const venvAlembicUnix = path.join(backendDir, "venv", "bin", "alembic");

  let alembicCmd = "alembic";
  if (isWin && fs.existsSync(venvPythonWin)) {
    alembicCmd = `"${venvPythonWin}" -m alembic`;
  } else if (isWin && fs.existsSync(venvAlembicWin)) {
    alembicCmd = `"${venvAlembicWin}"`;
  } else if (!isWin && fs.existsSync(venvAlembicUnix)) {
    alembicCmd = `"${venvAlembicUnix}"`;
  }

  try {
    execSync(`${alembicCmd} upgrade head`, {
      cwd: backendDir,
      stdio: "inherit",
      shell: true,
    });
    console.log("\x1b[32m[БД] Таблицы базы данных актуальны.\x1b[0m");
  } catch (err) {
    console.warn("\x1b[33m[БД] Замечание по миграциям: " + (err.message || err) + "\x1b[0m");
  }
}

async function start() {
  await tryStartPostgres();
  runMigrations();

  // Запуск Uvicorn (FastAPI)
  const venvPythonWin = path.join(backendDir, "venv", "python.exe");
  const venvUvicornWin = path.join(backendDir, "venv", "Scripts", "uvicorn.exe");
  const venvUvicornUnix = path.join(backendDir, "venv", "bin", "uvicorn");

  let cmd = "uvicorn";
  let args = ["app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"];

  if (isWin && fs.existsSync(venvPythonWin)) {
    cmd = venvPythonWin;
    args = ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"];
  } else if (isWin && fs.existsSync(venvUvicornWin)) {
    cmd = venvUvicornWin;
  } else if (!isWin && fs.existsSync(venvUvicornUnix)) {
    cmd = venvUvicornUnix;
  }

  console.log("\x1b[36m[Backend] Запуск сервера FastAPI на http://127.0.0.1:8000 ...\x1b[0m");
  const child = spawn(cmd, args, {
    cwd: backendDir,
    stdio: "inherit",
    shell: true,
  });

  child.on("error", (err) => {
    console.error("Ошибка запуска бэкенда:", err);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (code !== null) process.exit(code);
    if (signal) process.kill(process.pid, signal);
  });
}

start();
