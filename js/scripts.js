// Object for technical global page options
const config = {
	numberOfSeconds: 120,
	numberOfCurrencies: 5,
	sampleNum: 10,
	timeInterval: 2000,

	getCurrencySymbols: function () {
		return currencyQueue.map((item) => item.data.symbol).join();
	},

	fixTime: function (date) {
		const coeff = this.timeInterval;
		return new Date(parseInt(date / coeff) * coeff).getTime();
	},
};

// Object that change dynamicly
let currencyQueue = [];
let chart;
let innerInterval;
let candidate = {};

// Highchart options to create graph
const chartOptions = {
	chart: {
		events: {
			load: function () {
				const _this = this;

				// initual first points on the graphs
				$.get(`https://min-api.cryptocompare.com/data/pricemulti?tsyms=USD&fsyms=${config.getCurrencySymbols()}`).then((res) => {
					const date = new Date().getTime();
					for (let [key, value] of Object.entries(res)) {
						let date = new Date().getTime();
						_this.addSeries(
							{
								id: key,
								name: key,
								data: [],
							},
							false
						);
						chart.get(key).addPoint([config.fixTime(date), value.USD], true);
					}
					chart.redraw();
				});

				innerInterval = setInterval(function () {
					$.get(`https://min-api.cryptocompare.com/data/pricemulti?tsyms=USD&fsyms=${config.getCurrencySymbols()}`).then((res) => {
						if (!chart) {
							clearInterval(innerInterval);
							return;
						}

						const date = new Date().getTime();

						for (let [key, value] of Object.entries(res)) {
							_this.series.map((item, idk) => {
								if (item.name === key) {
									if (item.data.length <= 10) {
										_this.series[idk].addPoint([config.fixTime(date), value.USD], true);
									} else {
										_this.series[idk].addPoint([config.fixTime(date), value.USD], true, true);
									}
								}
							});
						}
					});
				}, config.timeInterval);
			},
		},
	},

	// use local time
	time: {
		useUTC: false,
	},

	title: {
		text: '',
	},

	yAxis: {
		title: {
			text: 'Coin Value',
		},
	},

	xAxis: {
		type: 'datetime',
	},

	legend: {
		layout: 'horizontal',
		align: 'center',
		verticalAlign: 'bottom',
	},
};

/*
	When user click on toggle currency its added to the queue
	of checked currencies.
*/
function addToQueue(e) {
	if (!$(e.target).hasClass('checkbox')) {
		return;
	}
	$('.alert').fadeOut('fast'); // if alert on close it
	const element = $(e.target).closest('.ancestors');
	const data = element.data(); // get cached data
	if (e.target.checked) {
		if (currencyQueue.length >= config.numberOfCurrencies) {
			$(e.target).prop('checked', false); // change the toogle to unchecked temp.
			candidate = data; // save the information on toggled
			showModal(); // show modal for decision
		} else {
			currencyQueue.push(element.data()); // add to queue
			element.data('queuePlace', currencyQueue.length - 1); // add property of place in queue
		}
	} else {
		const queuePlace = element.data('queuePlace'); // get place in queue
		currencyQueue.splice(queuePlace, 1); // delete element from queue
		currencyQueue.map((item, idx) => (item.queuePlace = idx)); // fix queue places property
	}
}

/*
	Create the modal with 5 elements that in queue
*/
function showModal() {
	$('#modalBody').empty(); // clear modal
	currencyQueue.map((item, idx) => {
		const currenct = $(
			`<div class="modalItem p-2 d-flex align-items-center justify-content-between">
				<div>${item.data.name}</div>
				<div>
					<label class="switch">
						<input id="checked-${idx}" class="checkbox-modal" type="checkbox" checked>
						<span class="slider"></span>
					</label>
				</div>
			</div>`
		).appendTo('#modalBody');

		currenct.data('data', item); // append data to the element
	});
	$('#modalComponent').modal('show'); // show modal
}

/*
	This event fire if user toggle currency in modal window.
*/
function modalChange(e) {
	if (!$(e.target).hasClass('checkbox-modal')) {
		return;
	}
	if (!e.target.checked) {
		const data = $(e.target).closest('.modalItem').data('data');

		// Get element for work
		const elementOld = $(`#${data.data.inner_id}`).find('.checkbox').first();
		const elementNew = $(`#${candidate.data.inner_id}`).find('.checkbox').first();

		// Remove old currency and add new one
		currencyQueue.splice(data.queuePlace, 1);
		currencyQueue.push(candidate);
		currencyQueue.map((item, idx) => (item.queuePlace = idx));

		// Toggle relevant checkboxs for visual effect
		$(elementNew).prop('checked', true);
		$(elementOld).prop('checked', false);
		delete data.queuePlace;
	}
	$('#modalBody').empty();
	$('#modalComponent').modal('hide');
}

/*
	This function is responce to button of more info
*/
function moreInfo(e) {
	if (!$(e.target).hasClass('btn')) {
		return;
	}
	const element = $(e.target).closest('.ancestors');
	const footHolder = element.find('.footer-hold').first();
	const dataAge = Math.abs(new Date() - element.data('last_updated')) / 1000;
	if (dataAge >= config.numberOfSeconds && !footHolder.hasClass('show')) {
		$.ajax({
			method: 'GET',
			url: `https://api.coingecko.com/api/v3/coins/${element.data('data').id}`,
			beforeSend: function () {
				element.find('.spinner').first().removeClass('d-none');
				element.find('.footer-hold-card').first().addClass('d-none');
			},
			complete: function () {
				element.find('.spinner').first().addClass('d-none');
				element.find('.footer-hold-card').first().removeClass('d-none');
			},
		}).then((res) => {
			let { market_data: { current_price: { usd, eur, ils } = {} } = {} } = res;
			element.data('data').prices = { usd, eur, ils };
			element.data('last_updated', new Date());
			footHolder.find('.list-group').each(function () {
				$(this).html(`<li class="list-group-item">$ ${usd}</li>
							  <li class="list-group-item">€ ${eur}</li>
							  <li class="list-group-item">₪ ${ils}</li>`);
			});
		});
	}
}

/* On document ready register events and execute ajax request */
$(document).ready(function () {
	/*
	Register event for search field, when user press key the event will hide 
	the element that dont match to user input.
	*/
	$('.form-control').keyup(function (e) {
		const searchValue = $(e.target).val().toLowerCase();
		$('#moduleHome')
			.children()
			.each(function (i, c) {
				let { symbol } = $(c).data('data');
				if (~symbol.toLowerCase().indexOf(searchValue)) {
					$(c).show();
				} else {
					$(c).hide();
				}
			});
	});

	/* 	Register few global events for buttons use */
	$('#moduleHome').click(moreInfo);
	$('#moduleHome').click(addToQueue);
	$('#modalBody').click(modalChange);

	$.ajaxSetup({
		cache: false,
	});

	/* 	Hide alert on start */
	$('.alert').hide();
	/* 	Rewrite the default bootsrap event for close button */
	$('.alert').on('close.bs.alert', function () {
		$('.alert').fadeOut('fast');
		return false;
	});

	/*
	Description: this functions used by nav bar to change page dynamically
	*/
	$('#id_home').click(function () {
		$('#moduleGraph').hide();
		$('#moduleAuthor').hide();
		$('#moduleHome').show();
		$('#id_about').removeClass('active');
		$('#id_graph').removeClass('active');
		$('#id_home').addClass('active');

		$('#nav-search').show();

		clearInterval(innerInterval); // Destroy the event if chart is not exist
		if (chart) {
			// if chart exist destroy it
			chart.destroy();
		}
	});

	$('#id_graph').click(function () {
		if (currencyQueue.length === 0) {
			$('.alert').fadeIn('fast');
			return;
		}
		$('#moduleHome').hide();
		$('#moduleAuthor').hide();
		$('#moduleGraph').show();
		$('#id_home').removeClass('active');
		$('#id_about').removeClass('active');
		$('#id_graph').addClass('active');
		$('#nav-search').hide();

		// Update chart based on currencies that waas choose
		chartOptions.title.text = `${config.getCurrencySymbols().toUpperCase()} to USD`;
		// Create brand new chart
		chart = Highcharts.chart('moduleGraph', chartOptions);
	});

	$('#id_about').click(function () {
		$('#moduleHome').hide();
		$('#moduleGraph').hide();
		$('#moduleAuthor').show();
		$('#id_home').removeClass('active');
		$('#id_graph').removeClass('active');
		$('#id_about').addClass('active');

		$('#nav-search').hide();
		$('.alert').hide();

		clearInterval(innerInterval); // Destroy the event if chart is not exist
		if (chart) {
			// if chart exist destroy it
			chart.destroy();
		}
	});

	$.get('https://api.coingecko.com/api/v3/coins').then((res) => {
		$('#moduleHome').empty();

		res.map((item, idx) => {
			const { market_data: { current_price: { usd, eur, ils } = {} } = {} } = item;

			const currenct = $(
				`<div id="${idx}" class="ancestors pt-4 col-12 col-md-6 col-lg-4">
				<div class="card rounded-lg">
					<div class="card-body">
						<div class="card-header text-right bg-transparent border-0 d-flex align-items-center justify-content-between">
						<h5 class="card-title text-uppercase font-weight-bold">${item.symbol}</h5>
						<label class="switch">
							<input class="checkbox" type="checkbox">
							<span class="slider"></span>
						</label>
						</div>
						<p class="card-text p-4">${item.name}</p>
						<div class="card-footer text-right bg-transparent border-0">
							<a href="#collapse-${idx}" data-toggle="collapse" class="btn btn-dark"><i class="fas fa-fw fa-cogs"></i>&nbsp&nbspMore Info</a>
						</div>
						<div class="footer-hold collapse" id="collapse-${idx}">
							<div class="spinner d-none">
								<div class="lds-ellipsis">
									<div></div>
									<div></div>
									<div></div>
									<div></div>
								</div>
							</div>
							<div class="footer-hold-card">
								<div class="card-footer footer-hold-card addition-data d-flex align-items-center border-0">
									<img src="${item.image.small}" alt="currency">
									<ul class="list-group p-3 w-100">
									<li class="list-group-item">$ ${usd}</li>
									<li class="list-group-item">€ ${eur}</li>
									<li class="list-group-item">₪ ${ils}</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>`
			).appendTo('#moduleHome');

			currenct.data('last_updated', new Date()).data('data', {
				inner_id: idx,
				id: item.id,
				symbol: item.symbol,
				name: item.name,
				image: item.image.small,
				prices: { usd, eur, ils },
			});
		});
	});
});
