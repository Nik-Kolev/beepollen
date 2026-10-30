# Server

How the production host is built, so it can be rebuilt. One Ubuntu 24.04
droplet runs the two GHCR images from `compose.prod.yaml` behind Nginx; it has
no checkout of the repository and never builds. Secrets appear here by name
only.

## 1. Base

As root, on a fresh droplet whose login is an SSH key with password login off.

Packages, with the image's unattended upgrades left on:

```bash
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade
```

A 4 GB swap file, kept for spikes:

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab
echo "vm.swappiness=10" > /etc/sysctl.d/99-swappiness.conf
sysctl -p /etc/sysctl.d/99-swappiness.conf
timedatectl set-timezone Europe/Sofia
```

A `deploy` user with passwordless sudo, since its login is key-only. Test its
login before root login is turned off, or the box locks you out:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-deploy
chmod 440 /etc/sudoers.d/90-deploy
visudo -cf /etc/sudoers.d/90-deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
```

Everything below runs as `deploy`. The firewall allows SSH before it is
enabled, or the session drops. Docker publishes ports past UFW's rules, which
is why `compose.prod.yaml` binds the app to `127.0.0.1:3000`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo apt-get install -y fail2ban
sudo systemctl enable --now fail2ban
```

Docker Engine and Compose from Docker's own repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

The group applies from the next login, so reconnect before running Docker as
`deploy`. Both GHCR packages are public and pull without `docker login`.

Root and passwords off, in a drop-in that sorts first so it wins:

```bash
printf "PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\n" \
  | sudo tee /etc/ssh/sshd_config.d/00-beepollen.conf
sudo sshd -t && sudo systemctl reload ssh
```

## 2. DNS

A records for `@` and `www` point at the droplet, DNS only: a proxy in front
would show Nginx the proxy's addresses instead of buyers', and the order rate
limiter would count every buyer as one.

## 3. Nginx and HTTPS

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo rm -f /etc/nginx/sites-enabled/default
```

Certbot needs a port-80 site for both names before it can answer the
challenge, so a temporary one comes first; `certonly` takes the certificate
without editing any config:

```bash
printf 'server {\n    listen 80;\n    listen [::]:80;\n    server_name beepollen.bg www.beepollen.bg;\n    return 404;\n}\n' \
  | sudo tee /etc/nginx/sites-enabled/certbot-bootstrap
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --nginx -d beepollen.bg -d www.beepollen.bg \
  --email <the shop's address> --agree-tos --no-eff-email --non-interactive
sudo rm /etc/nginx/sites-enabled/certbot-bootstrap
```

Then install `nginx/beepollen.conf` from this folder as the site. The copies
in this file run from Git Bash or another POSIX shell on the developer's
machine: piped through Windows PowerShell 5.1, a file arrives with CRLF line
endings and the script fails on `bash\r`.

```bash
git show main:deploy/nginx/beepollen.conf | ssh <host> 'cat > /tmp/beepollen.conf'
```

```bash
sudo install -m 644 /tmp/beepollen.conf /etc/nginx/sites-available/beepollen
sudo ln -sf /etc/nginx/sites-available/beepollen /etc/nginx/sites-enabled/beepollen
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

The dry run comes after the real site is live, since that site's redirect is
what renewal meets.

HTTP and `www` redirect to `https://beepollen.bg`, a single host because the
Auth.js cookies belong to the host that set them. `X-Real-IP` and
`X-Forwarded-For` are overwritten with the peer's address, so a client cannot
hand the order rate limiter a fresh IP. A client IP over 10 requests a
second, beyond a burst of 20, is answered 429 rather than Nginx's default 503,
which reads as an outage. Security headers come from
`next.config.ts`, not from here, so they are not sent twice.

## 4. The app

`~/beepollen` (mode 700) holds `compose.prod.yaml`, `deploy.sh` from this
folder and `.env` (mode 600, written under `umask 077`). Copy the first two from
`main`:

```bash
ssh <host> 'install -d -m 700 ~/beepollen'
git show main:compose.prod.yaml | ssh <host> 'cat > ~/beepollen/compose.prod.yaml'
git show main:deploy/deploy.sh | ssh <host> 'cat > ~/beepollen/deploy.sh && chmod 700 ~/beepollen/deploy.sh'
```

`.env` holds the variables the README lists. `AUTH_SECRET`,
`EMAIL_TOKEN_SECRET` and `REVALIDATE_SECRET` are generated on the server with
`openssl rand -base64 48 | tr -d "\n/+="`, never typed or printed; the Google
client's ID and secret are piped in over SSH. `AUTH_URL` is
`https://beepollen.bg` and `AUTH_TRUST_HOST` is left out. `ORDERING_OPEN` and
`ADMIN_WITHOUT_SIGN_IN` are `"false"`. `DATABASE_URL` comes from the compose
file.

## 5. Deploy

```bash
~/beepollen/deploy.sh
```

It pulls the images, backs up the database with the new image before its
migrations run, restarts the stack, waits up to a minute for the site, then
calls the revalidate route with the secret the running container holds, and
exits non-zero if any step fails. A changed `compose.prod.yaml` is copied over
first, as in step 4.

`IMAGE_TAG=<full 40-character commit sha> ~/beepollen/deploy.sh` rolls back
to that build, but only while no migration has landed since: an older image on
a newer schema breaks. A rollback across a migration restores first — the
README's `stop web` and copy steps, without its `up -d`, which would start the
newer image and migrate the restored database again — and only then runs the
script with the old tag. In that order the script's own backup copies the
restored database rather than replacing the day's pre-migration copy with the
migrated one. The replaced images stay on disk for rollbacks; `docker image
prune` deletes them, so it is a deliberate step of its own, never part of a
deploy.

## 6. Nightly backup

`deploy`'s crontab backs up the database at 03:00 server time (Europe/Sofia),
logging to the journal tagged `beepollen-backup`. Re-running this replaces the
line rather than adding a second one:

```bash
( crontab -l 2>/dev/null | grep -v beepollen-backup; echo '0 3 * * * cd /home/deploy/beepollen && docker compose -f compose.prod.yaml run --rm migrate npm run db:backup 2>&1 | logger -t beepollen-backup' ) | crontab -
```

Read the runs with `sudo journalctl -t beepollen-backup`. A day keeps one copy,
the latest, so a deploy between 00:00 and 03:00 loses its pre-migration copy to
the nightly one: deploy after 03:00. The copies stay in the volume beside the
database, on the same disk, until an off-host upload exists.
