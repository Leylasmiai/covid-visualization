// Set up dimensions and margins
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

let currentDataType = "total_cases"; // valeur par défaut
let worldData = null;
let mapData = null;
let timeSeriesData = null;


async function loadData() {
    try {
        console.log('Starting data load...');


        console.log('Loading COVID-19 data...');
        const baseUrl = 'http://localhost:8000/data/';

        try {
            // Add loading indicator
            d3.select('body').append('div')
                .attr('class', 'loading-message')
                .style('position', 'fixed')
                .style('top', '50%')
                .style('left', '50%')
                .style('transform', 'translate(-50%, -50%)')
                .style('background-color', '#007bff')
                .style('color', 'white')
                .style('padding', '20px')
                .style('border-radius', '5px')
                .style('z-index', '1000')
                .text('Loading data...');

            console.log('Fetching confirmed cases data...');
            const confirmedData = await d3.csv("data/time_series_covid19_confirmed_global.csv");
            console.log('Confirmed cases data loaded successfully');

            console.log('Fetching deaths data...');
            const deathsData = await d3.csv("data/time_series_covid19_deaths_global.csv");
            console.log('Deaths data loaded successfully');

            console.log('Fetching recovered data...');
            const recoveredData = await d3.csv("data/time_series_covid19_recovered_global.csv");
            console.log('Recovered data loaded successfully');
            console.log('Sample recovered data:', recoveredData.slice(0, 5));

            console.log('Processing data...');
            // Process the data
            const countries = new Set(confirmedData.map(d => d['Country/Region']));


            const recoveredMap = {};
            recoveredData.forEach(d => {
                recoveredMap[d['Country/Region']] = +d['Total_Recovered'] || 0;
            });

            // Get all dates from the data
            const dates = Object.keys(confirmedData[0]).filter(key => key.match(/\d+\/\d+\/\d+/));

            // Correction pour la génération de timeSeriesData
            timeSeriesData = dates.map(date => {
                const dailyData = {};
                countries.forEach(country => {
                    const countryConfirmed = confirmedData.find(d => d['Country/Region'] === country);
                    const countryDeaths = deathsData.find(d => d['Country/Region'] === country);

                    if (countryConfirmed && countryDeaths) {
                        dailyData[country] = {
                            confirmed: +countryConfirmed[date] || 0,
                            deaths: +countryDeaths[date] || 0,
                            recovered: 0 // Pas de données par date
                        };
                    }
                });
                return {
                    date: new Date(date),
                    data: dailyData
                };
            });

            // Process current totals
            worldData = Array.from(countries).map(country => {
                const countryConfirmed = confirmedData.find(d => d['Country/Region'] === country);
                const countryDeaths = deathsData.find(d => d['Country/Region'] === country);

                // Utiliser le nom du pays pour récupérer le total recovered
                const totalRecovered = recoveredMap[country] || 0;

                console.log(`Recovered for ${country}:`, totalRecovered);
                if (!countryConfirmed || !countryDeaths) {
                    console.warn(`Missing data for country: ${country}`);
                    return null;
                }

                // Dernière date pour confirmed/deaths
                const dates = Object.keys(countryConfirmed).filter(key => key.match(/\d+\/\d+\/\d+/));
                const latestDate = dates[dates.length - 1];

                const totalCases = +countryConfirmed[latestDate] || 0;
                const totalDeaths = +countryDeaths[latestDate] || 0;
                const activeCases = totalCases - totalDeaths - totalRecovered;

                console.log(`Recovered for ${country}:`, totalRecovered);
                const countryCode = countryConfirmed['Country/Region'] === 'US' ? 'USA' :
                    countryConfirmed['Country/Region'] === 'UK' ? 'GBR' :
                        countryConfirmed['Country/Region'] === 'Korea, South' ? 'KOR' :
                            countryConfirmed['Country/Region'] === 'Taiwan*' ? 'TWN' :
                                countryConfirmed['Country/Region'] === 'Congo (Kinshasa)' ? 'COD' :
                                    countryConfirmed['Country/Region'] === 'Congo (Brazzaville)' ? 'COG' :
                                        countryConfirmed['Country/Region'] === 'Cote d\'Ivoire' ? 'CIV' :
                                            countryConfirmed['Country/Region'] === 'Czechia' ? 'CZE' :
                                                countryConfirmed['Country/Region'] === 'Laos' ? 'LAO' :
                                                    countryConfirmed['Country/Region'] === 'Burma' ? 'MMR' :
                                                        countryConfirmed['Country/Region'] === 'West Bank and Gaza' ? 'PSE' :
                                                            countryConfirmed['Country/Region'] === 'Cabo Verde' ? 'CPV' :
                                                                countryConfirmed['Country/Region'] === 'Eswatini' ? 'SWZ' :
                                                                    countryConfirmed['Country/Region'] === 'Timor-Leste' ? 'TLS' :
                                                                        countryConfirmed['Country/Region'];

                return {
                    iso_code: countryCode,
                    location: country,
                    total_cases: totalCases,
                    total_deaths: totalDeaths,
                    total_recovered: totalRecovered,
                    active_cases: activeCases,
                    total_cases_per_million: totalCases / 1000000,
                    total_deaths_per_million: totalDeaths / 1000000
                };
            }).filter(d => d !== null); // Remove null entries

            console.log('Data processing completed');

            // Load world map data
            console.log('Loading world map data...');
            try {
                const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
                mapData = topojson.feature(world, world.objects.countries);
                console.log('World map data loaded successfully');
            } catch (error) {
                console.error('Failed to load world map data:', error);
                throw new Error('Could not load world map data');
            }

            // Create visualizations
            console.log('Creating visualizations...');
            createWorldMap();
            createHeatmap();
            createLineChart();
            createPieChart();
            console.log('All visualizations created successfully');

            // Add event listeners for control buttons
            d3.selectAll('.control-button').on('click', function () {
                // Retire la classe active de tous les boutons
                d3.selectAll('.control-button').classed('active', false);
                // Ajoute la classe active au bouton cliqué
                d3.select(this).classed('active', true);
                // Met à jour le type de donnée courant
                currentDataType = this.getAttribute('data-type');
                // Met à jour la carte
                updateWorldMap();
            });

            // Remove loading message
            d3.select('.loading-message').remove();

            // Remplir la liste des pays pour le filtre Trends
            const trendsSelect = d3.select("#trends-country-select");
            trendsSelect.append("option")
                .attr("value", "all")
                .text("All Countries");
            trendsSelect.selectAll("option.country")
                .data(worldData.sort((a, b) => a.location.localeCompare(b.location)))
                .enter()
                .append("option")
                .attr("class", "country")
                .attr("value", d => d.location)
                .text(d => d.location);

            // Update chart on selection
            trendsSelect.on("change", function () {
                const selected = this.value === "all" ? [] : [this.value];
                d3.select("#linechart").selectAll("*").remove();
                createLineChart(selected);
            });
        } catch (error) {
            console.error('Error loading data files:', error);
            throw new Error(`Failed to load data files: ${error.message}`);
        }
    } catch (error) {
        console.error('Error in loadData:', error);
        // Display error message to user
        d3.select('body').append('div')
            .attr('class', 'error-message')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background-color', '#ff4444')
            .style('color', 'white')
            .style('padding', '20px')
            .style('border-radius', '5px')
            .style('z-index', '1000')
            .text(`Error loading data: ${error.message}. Please check the console for details.`);
    }
}

// Create World Map
function createWorldMap() {
    const svg = d3.select("#worldmap")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const projection = d3.geoMercator()
        .fitSize([width, height], mapData);

    const path = d3.geoPath().projection(projection);

    // Add color scale
    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, d3.max(worldData, d => d[currentDataType])]);

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 20)`);

    const legendScale = d3.scaleLinear()
        .domain([0, d3.max(worldData, d => d[currentDataType])])
        .range([0, 100]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format(","));

    legend.append("g")
        .call(legendAxis);

    // Add gradient
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "colorGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    gradient.selectAll("stop")
        .data(colorScale.ticks(200))
        .enter().append("stop")
        .attr("offset", d => `${(d / d3.max(worldData, d => d[currentDataType])) * 100}%`)
        .attr("stop-color", d => colorScale(d));

    // Add gradient rectangle
    legend.append("rect")
        .attr("width", 20)
        .attr("height", 100)
        .style("fill", "url(#colorGradient)");

    // Add countries
    svg.selectAll("path")
        .data(mapData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            let countryData = worldData.find(c =>
                c.iso_code && d.id && c.iso_code.toLowerCase() === d.id.toLowerCase()
            );
            if (!countryData && d.properties && d.properties.name) {
                countryData = worldData.find(c =>
                    c.location && c.location.toLowerCase() === d.properties.name.toLowerCase()
                );
            }
            if (!countryData) {
                console.warn('No data for map country:', d.id);
            }
            return countryData ? colorScale(countryData[currentDataType]) : "#e0e0e0";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
            try {
                let countryData = worldData.find(c =>
                    c.iso_code && d.id && c.iso_code.toLowerCase() === d.id.toLowerCase()
                );
                if (!countryData && d.properties && d.properties.name) {
                    countryData = worldData.find(c =>
                        c.location && c.location.toLowerCase() === d.properties.name.toLowerCase()
                    );
                }

                d3.select(this)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 2);

                if (countryData) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`
                        <strong>${countryData.location}</strong><br/>
                        Total Cases: ${countryData.total_cases.toLocaleString()}<br/>
                        Total Deaths: ${countryData.total_deaths.toLocaleString()}<br/>
                        Total Recovered: ${countryData.total_recovered.toLocaleString()}<br/>
                        Active Cases: ${countryData.active_cases.toLocaleString()}<br/>
                        Cases per Million: ${countryData.total_cases_per_million.toLocaleString()}<br/>
                        Deaths per Million: ${countryData.total_deaths_per_million.toLocaleString()}
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                } else {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`
                        <strong>${d.properties ? d.properties.name : d.id}</strong><br/>
                        No data available
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            } catch (error) {
                console.warn(`Error showing tooltip for country ${d.id}:`, error);
            }
        })
        .on("mouseout", function (d) {
            d3.select(this)
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5);
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function updateWorldMap() {
    const maxValue = d3.max(worldData, d => d[currentDataType]);

    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, maxValue]);

    // Update legend scale
    const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, 100]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format(","));

    d3.select("#worldmap svg g .legend g")
        .call(legendAxis);

    // Update gradient
    const gradient = d3.select("#colorGradient");
    gradient.selectAll("stop")
        .data(colorScale.ticks(5))
        .attr("offset", d => `${(d / maxValue) * 100}%`)
        .attr("stop-color", d => colorScale(d));

    // Update countries
    d3.select("#worldmap svg g")
        .selectAll("path")
        .transition()
        .duration(750)
        .attr("fill", d => {
            try {
                let countryData = worldData.find(c =>
                    c.iso_code && d.id && c.iso_code.toLowerCase() === d.id.toLowerCase()
                );
                if (!countryData && d.properties && d.properties.name) {
                    countryData = worldData.find(c =>
                        c.location && c.location.toLowerCase() === d.properties.name.toLowerCase()
                    );
                }
                return countryData ? colorScale(countryData[currentDataType]) : "#e0e0e0";
            } catch (error) {
                console.warn(`Error updating country ${d.id}:`, error);
                return "#e0e0e0";
            }
        });
}

// Create Line Chart
function createLineChart(selectedCountries = []) {
    const svg = d3.select("#linechart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Utilise les pays sélectionnés ou les 5 premiers par défaut
    let topCountries;
    if (selectedCountries.length > 0) {
        topCountries = worldData.filter(d => selectedCountries.includes(d.location));
    } else {
        topCountries = [...worldData]
            .sort((a, b) => b.total_cases - a.total_cases)
            .slice(0, 5);
    }

    // Create scales
    const x = d3.scaleTime()
        .domain(d3.extent(timeSeriesData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(timeSeriesData, d =>
            Math.max(
                d3.max(topCountries, country => d.data[country.location]?.confirmed || 0),
                d3.max(topCountries, country => d.data[country.location]?.deaths || 0),
                d3.max(topCountries, country => d.data[country.location]?.recovered || 0)
            )
        )])
        .range([height, 0]);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    // Add lines for each country and metric
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const metrics = ['confirmed', 'deaths', 'recovered'];
    const metricColors = {
        confirmed: '#ff7f0e',
        deaths: '#d62728',
        recovered: '#2ca02c'
    };

    topCountries.forEach((country, i) => {
        metrics.forEach(metric => {
            const line = d3.line()
                .x(d => x(d.date))
                .y(d => y(d.data[country.location]?.[metric] || 0));

            svg.append("path")
                .datum(timeSeriesData)
                .attr("fill", "none")
                .attr("stroke", metricColors[metric])
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", metric === 'deaths' ? "5,5" : metric === 'recovered' ? "3,3" : "none")
                .attr("d", line);

            // Add country and metric label
            const lastDataPoint = timeSeriesData[timeSeriesData.length - 1];
            const lastValue = lastDataPoint.data[country.location]?.[metric] || 0;

            svg.append("text")
                .attr("x", width + 5)
                .attr("y", y(lastValue))
                .attr("dy", ".35em")
                .style("font-size", "10px")
                .style("fill", metricColors[metric])
                .text(`${country.location} (${metric}): ${lastValue.toLocaleString()}`);
        });
    });

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 150}, 20)`);

    metrics.forEach((metric, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendItem.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 20)
            .attr("y2", 0)
            .attr("stroke", metricColors[metric])
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", metric === 'deaths' ? "5,5" : metric === 'recovered' ? "3,3" : "none");

        legendItem.append("text")
            .attr("x", 25)
            .attr("y", 4)
            .style("font-size", "12px")
            .text(metric.charAt(0).toUpperCase() + metric.slice(1));
    });
}

// Create Heatmap
function createHeatmap() {
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Sort countries by total cases
    const sortedData = [...worldData].sort((a, b) => b.total_cases - a.total_cases);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, d3.max(sortedData, d => d.total_cases)]);

    // Create rectangles for each country
    svg.selectAll("rect")
        .data(sortedData)
        .enter()
        .append("rect")
        .attr("x", (d, i) => (i % 10) * (width / 10))
        .attr("y", (d, i) => Math.floor(i / 10) * (height / Math.ceil(sortedData.length / 10)))
        .attr("width", width / 10 - 2)
        .attr("height", height / Math.ceil(sortedData.length / 10) - 2)
        .attr("fill", d => colorScale(d.total_cases))
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <strong>${d.location}</strong><br/>
                Total Cases: ${d.total_cases.toLocaleString()}<br/>
                Total Deaths: ${d.total_deaths.toLocaleString()}<br/>
                Total Recovered: ${d.total_recovered.toLocaleString()}<br/>
                Active Cases: ${d.active_cases.toLocaleString()}<br/>
                Cases per Million: ${d.total_cases_per_million.toLocaleString()}<br/>
                Deaths per Million: ${d.total_deaths_per_million.toLocaleString()}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

// Create Pie Chart
function createPieChart() {
    const svg = d3.select("#piechart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    // Add filter controls
    const filterContainer = d3.select("#piechart")
        .insert("div", ":first-child")
        .attr("class", "filter-controls")
        .style("text-align", "center")
        .style("margin-bottom", "20px");

    filterContainer.append("label")
        .text("Select Country: ")
        .style("margin-right", "10px");

    const select = filterContainer.append("select")
        .style("padding", "5px")
        .style("border-radius", "4px")
        .style("border", "1px solid #ccc");

    // Add "All Countries" option
    select.append("option")
        .attr("value", "all")
        .text("All Countries");

    // Add country options
    select.selectAll("option.country")
        .data(worldData.sort((a, b) => a.location.localeCompare(b.location)))
        .enter()
        .append("option")
        .attr("value", d => d.iso_code)
        .text(d => d.location);

    // Add or select the title container above the SVG
    let pieTitle = d3.select("#piechart").select(".pie-title");
    if (pieTitle.empty()) {
        pieTitle = d3.select("#piechart")
            .insert("div", ":first-child")
            .attr("class", "pie-title")
            .style("text-align", "center")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .style("margin-bottom", "12px");
    }

    // Function to update pie chart
    function updatePieChart(selectedCountry) {
        let chartData;
        if (selectedCountry === "all") {
            // Calculate global totals
            const totalCases = d3.sum(worldData, d => d.total_cases);
            const totalDeaths = d3.sum(worldData, d => d.total_deaths);
            const totalRecovered = d3.sum(worldData, d => d.total_recovered);
            const totalActive = d3.sum(worldData, d => d.active_cases);

            chartData = [
                {
                    type: 'Active Cases',
                    value: totalActive
                },
                {
                    type: 'Deaths',
                    value: totalDeaths
                },
                {
                    type: 'Recovered',
                    value: totalRecovered
                }
            ];
        } else {
            const countryData = worldData.find(d => d.iso_code === selectedCountry);
            if (!countryData) {
                console.error('Data not found for country:', selectedCountry);
                return;
            }

            chartData = [
                {
                    type: 'Active Cases',
                    value: countryData.active_cases
                },
                {
                    type: 'Deaths',
                    value: countryData.total_deaths
                },
                {
                    type: 'Recovered',
                    value: countryData.total_recovered
                }
            ];
        }

        // Update pie chart
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        const pieData = pie(chartData);

        // Remove existing elements
        svg.selectAll("*").remove();

        // Create new arcs
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(Math.min(width, height) / 2);

        const color = d3.scaleOrdinal()
            .domain(['Active Cases', 'Deaths', 'Recovered'])
            .range(['#ff7f0e', '#d62728', '#2ca02c']);

        const g = svg.selectAll(".arc")
            .data(pieData)
            .enter().append("g")
            .attr("class", "arc");

        // Set the title outside the SVG
        pieTitle.text(
            selectedCountry === "all"
                ? ""
                : worldData.find(d => d.iso_code === selectedCountry).location
        );

        // Add total cases
        const totalCases = d3.sum(chartData, d => d.value);
        svg.append("text")
            .attr("x", 0)
            .attr("y", -height / 3 + 30)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("fill", "#666")
            .text(`Total Cases: ${totalCases.toLocaleString()}`);

        g.append("path")
            .attr("d", arc)
            .style("fill", d => color(d.data.type))
            .style("stroke", "white")
            .style("stroke-width", "2px")
            .on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.data.type}</strong><br/>
                    Count: ${d.data.value.toLocaleString()}<br/>
                    Percentage: ${((d.data.value / totalCases) * 100).toFixed(1)}%
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add labels
        g.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("fill", "white")
            .text(d => {
                const percentage = ((d.data.value / totalCases) * 100).toFixed(1);
                return `${d.data.type}\n${percentage}%`;
            });

        // Add legend
        const legend = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 12)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(chartData)
            .enter().append("g")
            .attr("transform", (d, i) => `translate(${width / 2 - 100},${height / 2 + 50 + i * 20})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => color(d.type));

        legend.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d => `${d.type}: ${d.value.toLocaleString()}`);
    }

    // Add event listener for select
    select.on("change", function () {
        updatePieChart(this.value);
    });

    // Initial render with all countries
    updatePieChart("all");

    // Example colors for slices
    const pieColors = d3.scaleOrdinal()
        .domain(['Active Cases', 'Deaths', 'Recovered'])
        .range(['#3a86ff', '#ff006e', '#21bb59']);

    // After drawing the pie slices:
    const legendData = [
        { label: 'Active Cases', color: '#3a86ff' },
        { label: 'Deaths', color: '#ff006e' },
        { label: 'Recovered', color: '#21bb59' }
    ];

    const legend = d3.select("#piechart")
        .append("div")
        .attr("class", "pie-legend");

    legend.selectAll(".pie-legend-item")
        .data(legendData)
        .enter()
        .append("div")
        .attr("class", "pie-legend-item")
        .html(d => `<span class="pie-legend-color" style="background:${d.color}"></span>${d.label}`);
}

// Load the data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting data load...');
    loadData();
});