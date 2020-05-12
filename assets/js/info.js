function calcLeaveHours(leave, unit) {
    switch (unit) {
        case 'h':
            return leave;
        case 'd':
            return calcLeaveHours(leave * 8, 'h');
        case 'w':
            return calcLeaveHours(leave * 5, 'd');
    }
}

function calcSalaryOn2080(salary, unit, hoursWorked) {
    switch (unit) {
        case 'h':
            return salary * hoursWorked;
        case 'y':
            return parseInt(salary)
    }
}

function salary(benefits) {
    var fixed = 2
    var leaveHours = calcLeaveHours(benefits.leave, benefits.leave_unit[0])
    var leavePercent = leaveHours / 2080
    var hoursWorked = (2080 - leaveHours)
    var salary = calcSalaryOn2080(benefits.salary, benefits.salary_unit[0], 2080)
    $('#salary').text("$" + salary.toFixed(fixed) + " based on 2080 hours (" + hoursWorked + " hours worked)")

    var leave = salary * leavePercent

    var retirement = salary * (benefits.retirement / 100)
    $('#leave').text((leavePercent * 100).toFixed(fixed) + "% = $" + leave.toFixed(fixed))
    $('#retirement').text(benefits.retirement + "% = $" + retirement.toFixed(fixed))

    var health = benefits.health_cost * (benefits.health / 100)
    $('#health').text("$" + health.toFixed(fixed))

    var trainingPercent = benefits.training_cash
    var training = parseInt(benefits.training)
    if (trainingPercent > 0)
        training *= trainingPercent / 100
    $('#training').text("$" + training.toFixed(fixed))

    var package = leave + retirement + health + training
    var packagePercent = package / salary
    $('#benefit').text("Total Benefit: " + 
            "$" + package.toFixed(fixed) + 
            " (" + (packagePercent * 100).toFixed(fixed) + "% of Base Salary)")
    var compensation = salary + package
    $('#package').text("Total Compensation: $" + compensation.toFixed(fixed) +
        " (effective $" + (compensation / 2080).toFixed(fixed) + " per hour)")
}

function toObject(form) {
    var data = {};
    $.each($(form).serializeArray(), function () {
        data[this.name] = this.value;
    });
    return data;
}

function onSubmit(form) {
    var data = toObject(form);
    return false; //don't submit
}

function calculate() {
    var benefits = toObject(document.forms.form)
    salary(benefits);
}