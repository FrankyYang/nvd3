nv.models.scatterWithFocusChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var scatter      = nv.models.scatter()
    , scatter2     = nv.models.scatter() // 二次元定义
    , xAxis        = nv.models.axis()
    , yAxis        = nv.models.axis()
    , x2Axis       = nv.models.axis()
    , y2Axis       = nv.models.axis()
    , legend       = nv.models.legend()
    , controls     = nv.models.legend()
    , distX        = nv.models.distribution()
    , distY        = nv.models.distribution()
    , distX2       = nv.models.distribution()
    , distY2       = nv.models.distribution()
    ;

  var margin       = {top: 30, right: 20, bottom: 50, left: 75}
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , width        = null
    , height       = null
    , height2      = 300
    , color        = nv.utils.defaultColor()
    , x            = scatter.xScale()
    , y            = scatter.yScale()
    , x2
    , y2
    , xPadding     = 0
    , yPadding     = 0
    , showDistX    = false
    , showDistY    = false
    , showLegend   = true
    , showXAxis    = true
    , showYAxis    = true
    , rightAlignYAxis = false
    , pauseFisheye = false
    , tooltips     = true
    , tooltipX     = function(key, x, y) { return '<strong>' + x + '</strong>' }
    , tooltipY     = function(key, x, y) { return '<strong>' + y + '</strong>' }
    , tooltip      = null
    , state = {}
    , defaultState = null
    , dispatch     = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'brush')
    , noData       = "No Data Available."
    , transitionDuration = 250
    , brush = d3.svg.brush()
    , brushExtent = null
    ;

  scatter
    .xScale(x)
    .yScale(y)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(10)
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    .tickPadding(10)
    ;
  distX
    .axis('x')
    ;
  distY
    .axis('y')
    ;
  scatter2 // 二次元坐标设置
    .xScale(x)
    .yScale(y)
    ;
  x2Axis
    .orient('bottom')
    .tickPadding(5)
    ;
  y2Axis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    .tickPadding(5)
    ;
  distX2
    .axis('x')
    ;
  distY2
    .axis('y')
    ;


  controls.updateState(false);

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0;

  var showTooltip = function(e, offsetElement) {
    //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = y.range()[0] + margin.top + ( offsetElement.offsetTop || 0),
        leftY = x.range()[0] + margin.left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = xAxis.tickFormat()(scatter2.x()(e.point, e.pointIndex)),
        yVal = yAxis.tickFormat()(scatter2.y()(e.point, e.pointIndex));

      if( tooltipX != null )
          nv.tooltip.show([leftX, topX], tooltipX(e.series.key, xVal, yVal, e, chart), 'n', 1, offsetElement, 'x-nvtooltip');
      if( tooltipY != null )
          nv.tooltip.show([leftY, topY], tooltipY(e.series.key, xVal, yVal, e, chart), 'e', 1, offsetElement, 'y-nvtooltip');
      if( tooltip != null )
          nv.tooltip.show([left, top], tooltip(e.series.key, xVal, yVal, e, chart), e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  var controlsData = [
    { key: 'Magnify', disabled: true }
  ];

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          /*
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
          */

          availableHeight1 = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - height2,
          availableHeight2 = height2 - margin2.top - margin2.bottom;

      chart.update = function() { container.transition().duration(transitionDuration).call(chart); };
      chart.container = this;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled });

      if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
          if (state[key] instanceof Array)
            defaultState[key] = state[key].slice(0);
          else
            defaultState[key] = state[key];
        }
      }

      //------------------------------------------------------------
      // Display noData message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight2 / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = scatter.xScale();
      y = scatter.yScale();
      x2 = scatter2.xScale();
      y2 = scatter2.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-scatterChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-scatterChart nv-chart-' + scatter.id());
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-legendWrap');

      var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y nv-axis');
      focusEnter.append('g').attr('class', 'nv-scatterWrap');
      focusEnter.append('g').attr('class', 'nv-distWrap');

      var contextEnter = gEnter.append('g').attr('class', 'nv-context');
      contextEnter.append('g').attr('class', 'nv-x nv-axis');
      contextEnter.append('g').attr('class', 'nv-y nv-axis');
      contextEnter.append('g').attr('class', 'nv-scatterWrap');
      contextEnter.append('g').attr('class', 'nv-distWrap');
      contextEnter.append("g").attr("class", "brush-rect nv-brush")

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        var legendWidth = availableWidth;
        legend.width(legendWidth);

        wrap.selectAll('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight1 = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.selectAll('.nv-legendWrap')
            .attr('transform', 'translate(' + (availableWidth - legendWidth) + ',' + (-margin.top) +')');
      }

      //------------------------------------------------------------


      //------------------------------------------------------------


      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      if (rightAlignYAxis) {
          g.selectAll(".nv-y.nv-axis")
              .attr("transform", "translate(" + availableWidth + ",0)");
      }

      //------------------------------------------------------------
      // Setup Main(focus) Chart Component(s)

      scatter
          .width(availableWidth)
          .height(availableHeight1)
          .color(data.map(function(d,i) {
            return d.color || color(d, i);
          }).filter(function(d,i) { return !data[i].disabled }));

      // 设置阶段，设定二次元的宽高和颜色
      scatter2
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled }));

      if (xPadding !== 0) {
        scatter.xDomain(null);
        scatter2.xDomain(null);
      }

      if (yPadding !== 0) {
        scatter.yDomain(null);
        scatter2.yDomain(null);
      }

      // 这就是一个奇迹，让图形能够上下布局展示的关键性语句
      wrap.select('.nv-context')
          .attr('transform', 'translate(0,' + ( availableHeight1 + margin.bottom + margin2.top) + ')')

      // 原一次元位于下方，做为context，二次元的数据brush选择生成，为focus
      wrap.select('.nv-context .nv-scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(scatter);

      //Adjust for x and y padding
      if (xPadding !== 0) {
        var xRange = x.domain()[1] - x.domain()[0];
        scatter.xDomain([x.domain()[0] - (xPadding * xRange), x.domain()[1] + (xPadding * xRange)]);
        scatter2.xDomain([x.domain()[0] - (xPadding * xRange), x.domain()[1] + (xPadding * xRange)]);
      }

      if (yPadding !== 0) {
        var yRange = y.domain()[1] - y.domain()[0];
        scatter.yDomain([y.domain()[0] - (yPadding * yRange), y.domain()[1] + (yPadding * yRange)]);
        scatter2.yDomain([y.domain()[0] - (yPadding * yRange), y.domain()[1] + (yPadding * yRange)]);
      }

      //Only need to update the scatter again if x/yPadding changed the domain.
      if (yPadding !== 0 || xPadding !== 0) {
        wrap.select('.nv-focus .nv-scatterWrap')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(scatter);
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes
      if (showXAxis) {
        xAxis
            .scale(x)
            .ticks( xAxis.ticks() && xAxis.ticks().length ? xAxis.ticks() : availableWidth / 100 )
            .tickSize( -availableHeight1 , 0);
        x2Axis
            .scale(x2)
            .ticks( x2Axis.ticks() && x2Axis.ticks().length ? x2Axis.ticks() : availableWidth / 100 )
            .tickSize( -availableHeight2 , 0);


        wrap.select('.nv-focus .nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y2.range()[0] + ')')
            .call(xAxis);

        wrap.select('.nv-context .nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y2.range()[0] + ')')
            .call(x2Axis);

      }

      if (showYAxis) {
        yAxis
            .scale(y)
            .ticks( yAxis.ticks() && yAxis.ticks().length ? yAxis.ticks() : availableHeight1 / 36 )
            .tickSize( -availableWidth, 0);

        y2Axis
            .scale(y2)
            .ticks( y2Axis.ticks() && y2Axis.ticks().length ? y2Axis.ticks() : availableHeight2 / 36 )
            .tickSize( -availableWidth, 0);

        d3.transition(wrap.select('.nv-focus .nv-y.nv-axis'))
            .call(yAxis);

        d3.transition(wrap.select('.nv-context .nv-y.nv-axis'))
            .call(y2Axis);

        wrap.select('.nv-focus .nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y2.range()[0] + ')');

        wrap.select('.nv-context .nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      }


      if (showDistX) {
        distX
            .getData(scatter.x())
            .scale(x)
            .width(availableWidth)
            .color(data.map(function(d,i) {
              return d.color || color(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));

        wrap.select('.nv-focus .nv-distWrap').append('g')
            .attr('class', 'nv-distributionX');
        wrap.select('.nv-focus .nv-distributionX')
            .attr('transform', 'translate(0,' + y.range()[0] + ')')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distX);

        distX2
            .getData(scatter2.x())
            .scale(x2)
            .width(availableWidth)
            .color(data.map(function(d,i) {
              return d.color || color(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        wrap.select('.nv-context .nv-distWrap').append('g')
            .attr('class', 'nv-distributionX');
        wrap.select('.nv-context .nv-distributionX')
            .attr('transform', 'translate(0,' + y.range()[0] + ')')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distX2);
      }

      if (showDistY) {
        distY
            .getData(scatter.y())
            .scale(y)
            .width(availableHeight1)
            .color(data.map(function(d,i) {
              return d.color || color(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        wrap.select('.nv-focus .nv-distWrap').append('g')
            .attr('class', 'nv-distributionY');
        wrap.select('.nv-focus .nv-distributionY')
            .attr('transform', 
              'translate(' + (rightAlignYAxis ? availableWidth : -distY.size() ) + ',0)')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distY);

        distY2
            .getData(scatter2.y())
            .scale(y2)
            .width(availableHeight2)
            .color(data.map(function(d,i) {
              return d.color || color(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        wrap.select('.nv-context .nv-distWrap').append('g')
            .attr('class', 'nv-distributionY');
        wrap.select('.nv-context .nv-distributionY')
            .attr('transform', 
              'translate(' + (rightAlignYAxis ? availableWidth : -distY.size() ) + ',0)')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distY);

      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Brush

      brush
        .x(x2)
        .y(y2)
        .on("brushend", function () {
          var brushExtent = brush.empty() ? null : brush.extent();
          var extent = brush.empty() ? x2.domain() : brush.extent();

          var x0 = extent[0][0];
          var x1 = extent[1][0];
          var y0 = extent[0][1];
          var y1 = extent[1][1];

          dispatch.brush({extent: extent, brush: brush});

          // Key connection between two charts
          var focusWrap = wrap.select('.nv-focus .nv-scatterWrap')
            .datum(
              data
                .filter(function(d) { return !d.disabled })
                .map(function(d,i) {
                  return {
                    key: d.key,
                    values: d.values.filter(function(d,i) {
                      if(scatter.x()(d,i) >= x0 && scatter.x()(d,i) <= x1
                        && scatter.y()(d,i) >= y0 && scatter.y()(d,i) <= y1) {
                        console.log(scatter.x()(d,i));
                        console.log(scatter.y()(d,i));
                        return true;
                      }
                    })
                  }
                })
            );

            // 在这里更新其它图形
            focusWrap.transition().duration(transitionDuration).call(scatter);

            // Update Main (Focus) Axes
            wrap.select('.nv-focus .nv-x.nv-axis').transition().duration(transitionDuration)
                .call(xAxis);
            wrap.select('.nv-focus .nv-y.nv-axis').transition().duration(transitionDuration)
                .call(yAxis);
        })

      if (brushExtent) brush.extent(brushExtent);

      var gBrush = wrap.select('.brush-rect.nv-brush')
          .call(brush);
/*
        .on("brushend", function () {
          if (!d3.event.sourceEvent) return; // only transition after input
          d3.select(this).transition()
              // .duration(brush.empty() ? 0 : 750)
              // .call(brush.extent(defaultExtent))
              // .call(brush.event);
        });
*/

      //------------------------------------------------------------


      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      controls.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        g.select('.nv-background') .style('pointer-events', d.disabled ? 'none' : 'all');
        g.select('.nv-point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
          g.select('.nv-scatterWrap').call(scatter);
          g.select('.nv-x.nv-axis').call(xAxis);
          g.select('.nv-y.nv-axis').call(yAxis);
        } else {
          pauseFisheye = false;
        }

        chart.update();
      });

      legend.dispatch.on('stateChange', function(newState) {
        state.disabled = newState.disabled;
        dispatch.stateChange(state);
        chart.update();
      });

      scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
            .attr('y1', function(d,i) { return e.pos[1] - availableHeight1;});
        d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
            .attr('x2', e.pos[0] + distX.size());

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(e) {

        if (typeof e.disabled !== 'undefined') {
          data.forEach(function(series,i) {
            series.disabled = e.disabled[i];
          });

          state.disabled = e.disabled;
        }

        chart.update();
      });

      //============================================================


      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();


    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  scatter.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);

    d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
        .attr('y1', 0);
    d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
        .attr('x2', distY.size());
  });
  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.scatter = scatter;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.x2Axis = x2Axis;
  chart.y2Axis = y2Axis;
  chart.distX = distX;
  chart.distY = distY;
  chart.distX2 = distX2;
  chart.distY2 = distY2;

  d3.rebind(chart, scatter, 'id', 'interactive', 'pointActive', 'x', 'y', 'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'sizeDomain', 'sizeRange', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius', 'useVoronoi');
  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    distX.color(color);
    distY.color(color);
    return chart;
  };

  chart.showDistX = function(_) {
    if (!arguments.length) return showDistX;
    showDistX = _;
    return chart;
  };

  chart.showDistY = function(_) {
    if (!arguments.length) return showDistY;
    showDistY = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.showXAxis = function(_) {
    if (!arguments.length) return showXAxis;
    showXAxis = _;
    return chart;
  };

  chart.showYAxis = function(_) {
    if (!arguments.length) return showYAxis;
    showYAxis = _;
    return chart;
  };

  chart.rightAlignYAxis = function(_) {
    if(!arguments.length) return rightAlignYAxis;
    rightAlignYAxis = _;
    yAxis.orient( (_) ? 'right' : 'left');
    return chart;
  };

  chart.xPadding = function(_) {
    if (!arguments.length) return xPadding;
    xPadding = _;
    return chart;
  };

  chart.yPadding = function(_) {
    if (!arguments.length) return yPadding;
    yPadding = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.tooltipXContent = function(_) {
    if (!arguments.length) return tooltipX;
    tooltipX = _;
    return chart;
  };

  chart.tooltipYContent = function(_) {
    if (!arguments.length) return tooltipY;
    tooltipY = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) return state;
    state = _;
    return chart;
  };

  chart.defaultState = function(_) {
    if (!arguments.length) return defaultState;
    defaultState = _;
    return chart;
  };
  
  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };

  //============================================================


  return chart;
}
