var gulp = require('gulp');
var rimraf = require('gulp-rimraf');
var eslint = require('gulp-eslint');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var terser = require('gulp-terser');
var rollup = require('rollup-stream');
var nodeResolve = require('rollup-plugin-node-resolve');

function js(isProd) {
  var bundler = rollup({
    input: './client/index.js',
    name: 'app.js',
    format: 'umd',
    sourcemap: true,
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true
      })
    ]
  }).pipe(source('app.js', './dist/client'));
  if (isProd) {
    bundler
      .pipe(buffer())
      .pipe(terser());
  }
  return bundler.pipe(gulp.dest('./dist/client'));
}

function statics() {
  return gulp.src([
    './client/index.html',
    './client/app.css'
  ])
    .pipe(gulp.dest('./dist/client'));
}

function server() {
  return gulp.src('./server/**/*')
    .pipe(gulp.dest('./dist/server'));
}

function clean() {
  return gulp.src('./dist/**/*', {read: false})
    .pipe(rimraf());
}

function lint() {
  return gulp.src(['./client/**/*.js', './server/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}
exports.lint = lint;

function watch() {
  gulp.watch(['./client/**/*', './server/**/*'], build);
}
exports.watch = watch;

const build = gulp.series(
  clean,
  gulp.parallel(
    statics,
    server,
    js.bind(this, false))
);
exports.build = build;

exports.build_prod = gulp.series(
  clean,
  lint,
  gulp.parallel(
    statics,
    server,
    js.bind(this, true))
);