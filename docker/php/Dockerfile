FROM php:8.4-fpm-alpine

# Pobranie gotowego skryptu do instalacji rozszerzeń PHP
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

# Instalacja narzędzi runtime oraz rozszerzeń PHP jednym poleceniem
# Skrypt automatycznie używa kompilacji wielowątkowej i czyści po sobie pliki tymczasowe
RUN apk add --no-cache \
        git \
        curl \
        zip \
        unzip \
    && install-php-extensions \
        pdo_pgsql \
        pgsql \
        zip \
        gd \
        bcmath \
        pcntl \
        intl \
        exif

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Uruchamiamy workery jako uid/gid 1000, żeby pasowały do właściciela
# zamontowanego z hosta ./backend (bind mount, nie build-time COPY)
RUN sed -i "s/^user = .*/user = 1000/; s/^group = .*/group = 1000/" /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]