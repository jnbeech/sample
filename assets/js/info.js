/*global angular*/
/*global $*/
/*global location*/

(function () {
  var queryDict = {};
  location.search.substr(1).split("&").forEach(function (item) {
    queryDict[item.split("=")[0]] = item.split("=")[1]
  });

  // interpolateProvider: https://katydecorah.com/code/jekyll-and-angular/
  var app = angular.module('benefitCalculator', [],
    function ($interpolateProvider) {
      $interpolateProvider.startSymbol('[[');
      $interpolateProvider.endSymbol(']]');
    });

  app.controller('MainController', ['$scope', '$http', function ($scope, $http) {
    // Get settings
    $.getJSON("/sample/assets/settings.json").then(function (settings) {
      $scope.settings = settings;
      $scope.config = settings.config;
      $scope.planYear = settings.config.planYear;
      $scope.maximumYear = settings.config.maximumYear;
      $scope.insurancePlans = settings[settings.config.planYear].fixed_employee;
      $scope.stdAgeMap = settings[settings.config.planYear].stdlife;
      $scope.hsaMaximums = settings[settings.config.maximumYear].maximums.hsa;
      $scope.retirementMaximums = settings[settings.config.maximumYear].maximums.retirement;
      $scope._401kEmployerContribution = settings[settings.config.maximumYear]._401kEmployerContribution;
      $scope.benefits = Object.keys($scope.insurancePlans);
      $scope.planLevels = settings.levels;
      $scope.$apply()
    });

    // Income
    $scope.tcRate = 0;
    if (queryDict.hasOwnProperty('tcr') && parseFloat(queryDict.tcr) > 0) {
      $scope.tcRate = parseFloat(queryDict.tcr);
    }
    if (queryDict.hasOwnProperty('rate') && parseFloat(queryDict.rate) > 0) {
      $scope.tcRate = parseFloat(queryDict.rate);
    }
    $scope.totalHours = 1840;
    if (queryDict.hasOwnProperty('hours') && parseFloat(queryDict.hours) > 0) {
      $scope.totalHours = parseFloat(queryDict.hours);
    }

    // PTO
    $scope.ptoPlan = 30;
    if (queryDict.hasOwnProperty('pto') && parseFloat(queryDict.pto) > 0) {
      $scope.ptoPlan = parseFloat(queryDict.pto);
    }
    $scope.ptoPercent = function () {
      return 1 + 1 / $scope.ptoPlan;
    };

    // 401(k)
    $scope.rbe = true;
    $scope._401kPercent = 6;
    $scope.catch_up = false;
    $scope.retirementMaximums = {};
    $scope.max401k = function () {
      return $scope.catch_up ? ($scope.retirementMaximums.employee + $scope.retirementMaximums.catchup) : $scope.retirementMaximums.employee;
    };

    // Benefits
    $scope.benefits = [];
    $scope.planLevels = [];
    $scope.plan = {};
    $scope.level = {};

    $scope.stdBenefit = function () {
      return Math.min(2500, $scope.benefitsSalary() / 52 * 0.6);
    };

    $scope.ltdBenefit = function () {
      return Math.min(7500, $scope.benefitsSalary() / 12 * 0.6);
    };

    $scope.stdAgeMap = {};

    // HSA
    $scope.hsa_catch_up = false;
    $scope.HSARegExp = new RegExp("HSA");
    $scope.weeklyHSA = 0;
    $scope.monthlyHSA = 0;
    $scope.annualHSA = 0;
    $scope.hsaMaximums = {};

    // Functions
    $scope.payRate = function () {
      var rate;
      if ($scope.rbe) {
        rate = $scope.tcRate /
          ($scope._401kEmployerContribution / 100 + 1) /
          $scope.ptoPercent();
      } else {
        rate = $scope.tcRate / $scope.ptoPercent();
      }
      return rate;
    };

    $scope.annualPTOHours = function () {
      return $scope.totalHours / $scope.ptoPlan;
    };

    $scope.annualPTOPay = function () {
      return $scope.annualPTOHours() * $scope.payRate();
    };

    $scope.maxHSA = function () {
      var base = ($scope.level['Health'] > 0) ? $scope.hsaMaximums.family : $scope.hsaMaximums.individual;
      if ($scope.hsa_catch_up) {
        base += $scope.hsaMaximums.catchup;
      }
      return base;
    };

    $scope.updateHSA = function (t) {
      switch (t) {
        case "weekly":
          $scope.annualHSA = Math.round(($scope.weeklyHSA * 52) * 100) / 100;
          $scope.monthlyHSA = Math.round(($scope.annualHSA / 12) * 100) / 100;
          break;
        case "monthly":
          $scope.annualHSA = Math.round(($scope.monthlyHSA * 12) * 100) / 100;
          $scope.weeklyHSA = Math.round(($scope.annualHSA / 52) * 100) / 100;
          break;
        case "annual":
          $scope.monthlyHSA = Math.round(($scope.annualHSA / 12) * 100) / 100;
          $scope.weeklyHSA = Math.round(($scope.annualHSA / 52) * 100) / 100;
          break;
      }
      if ($scope.annualHSA > $scope.maxHSA()) {
        $scope.maxOutHSA();
      }
    };

    $scope.HSAEligible = function () {
      return ($scope.plan['Health'] != '--' &&
        $scope.level['Health'] !== undefined &&
        $scope.HSARegExp.test($scope.plan['Health'])
      );
    };

    $scope.maxOutHSA = function () {
      $scope.annualHSA = $scope.maxHSA();
      $scope.updateHSA('annual');
    };

    $scope.cost = function (year, benefit, plan, level) {
      if (year === undefined || year == '--' ||
        benefit === undefined ||
        plan === undefined || plan == '--' ||
        level === undefined || level == '--') {
        return 0;
      } else {
        return $scope.insurancePlans[benefit][plan][level];
      }
    };

    $scope.stdCost = function () {
      if ($scope.plan['stdlife'] !== '--' && $scope.stdRate !== undefined) {
        return ($scope.stdBenefit() / 10) * $scope.stdRate;
      } else {
        return 0;
      }
    };

    $scope.monthyInsuranceRate = function () {
      var sum = $scope.benefits.reduce(function (c, b) {
        return c + $scope.cost($scope.planYear, b, $scope.plan[b], $scope.level[b]);
      }, 0);
      return sum + $scope.stdCost();
    };

    $scope.annualInsuranceRate = function () {
      return $scope.monthyInsuranceRate() * 12;
    };

    $scope.timeOff = function () {
      return ($scope.config.stdHours - $scope.totalHours) / 8;
    };

    $scope.grossIncome = function () {
      return $scope.payRate() * $scope.totalHours + $scope.annualPTOPay();
    };

    $scope.benefitsSalary = function () {

      return $scope.tcRate * $scope.config.salaryHours;
    };

    $scope.employee401kContribution = function () {
      if ($scope.rbe) {
        return Math.min($scope.max401k(), $scope.grossIncome() * ($scope._401kPercent / 100));
      } else {
        return 0;
      }
    };

    $scope.employer401kContribution = function () {
      if ($scope.rbe) {
        return Math.min($scope.grossIncome() * ($scope._401kEmployerContribution / 100), $scope.maxEmployer401kContribution());
      } else {
        return 0;
      }
    };

    $scope.maxEmployer401kContribution = function () {
      return ($scope._401kEmployerContribution / 100) * $scope.retirementMaximums.max_comp;
    };

    $scope.total401kContribution = function () {
      return $scope.employee401kContribution() + $scope.employer401kContribution();
    };

    $scope.totalHSAContribution = function () {
      if ($scope.annualHSA > $scope.maxHSA()) {
        $scope.maxOutHSA();
      }
      return $scope.HSAEligible() ? parseFloat($scope.annualHSA) : 0;
    };

    $scope.adjustedGrossIncome = function () {
      return $scope.grossIncome() -
        $scope.employee401kContribution() -
        $scope.annualInsuranceRate() -
        $scope.totalHSAContribution();
    };

    $scope.totalCompensation = function () {
      return $scope.adjustedGrossIncome() +
        $scope.total401kContribution() +
        $scope.annualInsuranceRate() +
        $scope.totalHSAContribution();
    };
  }]);
})();

$(function () {
  $(document).tooltip();
});