const Day = [0, 1, 3, 7, 15, 21]; //today
const tomorrow = [1, 2, 4, 8, 16, 22];
const today = new Date();

let table = "| # | Date | |\n";
table += "|---|------|---|\n";

Day.forEach((days, index) => {  //change intervals for array
    const date = new Date(today);
    date.setDate(today.getDate() + days);

    const formatted = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });

    table += `| ${index + 1} | ${formatted} | |\n`;
});

console.log(table);