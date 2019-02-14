import gulp from 'gulp';
import sourcemaps from 'gulp-sourcemaps';
import concat from 'gulp-concat';
import rollup from 'rollup-stream';
import babel from 'rollup-plugin-babel';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import nodeResolve from 'rollup-plugin-node-resolve';
import terser from 'gulp-terser';

function build() {
  return rollup({
    input: './app/webcomponents/index.js',
    name: 'nb-webcomponents.min.js',
    format: 'umd',
    sourcemap: true,
    plugins: [
      babel({
        babelrc: false,
        plugins: ['transform-class-properties']
      }),
      nodeResolve({
        jsnext: true,
        main: true
      })
    ]
  }).pipe(source('index.js', './app/webcomponents'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(terser())
    .pipe(concat('nb-webcomponents.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
}
