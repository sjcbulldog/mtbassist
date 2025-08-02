    const gulp = require("gulp");
    const inline = require("gulp-inline");

    gulp.task("default", () => {
      return gulp
        .src("./dist/content/browser/index.html") // Adjust path based on your build output
        .pipe(inline())
        .pipe(gulp.dest("./single-dist"));
    });
