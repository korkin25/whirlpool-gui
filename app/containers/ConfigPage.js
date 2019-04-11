// @flow
import React, { Component } from 'react';
import { Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import { WHIRLPOOL_SERVER } from '../const';
import { logger } from '../utils/logger';
import { CliConfigService } from '../services/cliConfigService';
import utils from '../services/utils';
import poolsService from '../services/poolsService';

type Props = {};

const SERVER_MAIN = 'MAIN'
export default class ConfigPage extends Component<Props> {

  constructor(props) {
    super(props)

    this.state = {
      info: undefined,
      error: undefined,
      cliConfig: undefined
    }

    this.cliConfigService = new CliConfigService(cliConfig => this.setState({
      cliConfig: cliConfig
    }))

    this.onResetConfig = this.onResetConfig.bind(this)
    this.onChangeCliConfig = this.onChangeCliConfig.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  onResetConfig() {
    if (confirm('This will reset CLI configuration. Are you sure?')) {
      this.cliConfigService.resetConfiguration()
    }
  }

  onChangeCliConfig(set) {
    const cliConfig = this.state.cliConfig
    set(this.state.cliConfig)

    this.setState({
      cliConfig: cliConfig
    })
  }

  onSubmit(e) {
    this.cliConfigService.save(this.state.cliConfig).then(() => {
      logger.info('Configuration updated')
      this.setState({
        info: 'Configuration saved',
        error: undefined
      })
    }).catch(e => {
      logger.error('', e)
      this.setState({
        info: undefined,
        error: e.message
      })
    })
  }

  render() {
    if (!this.state.cliConfig) {
      return <small>Fetching CLI configuration...</small>
    }
    const cliConfig = this.state.cliConfig
    if (!cliConfig.mix) {
      cliConfig.mix = {}
    }
    const myThis = this
    const checked = e => {
      return e.target.checked
    }
    const poolIdValue = cliConfig.mix.poolIdsByPriority ? cliConfig.mix.poolIdsByPriority[0] : ''
    const ALL_POOLS_LABEL = 'All pools'
    const autoAggregatePostmixPossible = cliConfig.mix.autoTx0 && cliConfig.server !== SERVER_MAIN
    return (
      <div>
        <h1>CLI configuration</h1>

        <form onSubmit={(e) => {this.onSubmit(e);e.preventDefault()}}>
          <div className="form-group row">
            <div className="col-sm-12">
              {this.state.error && <Alert variant='danger'>{this.state.error}</Alert>}
              {this.state.info && <Alert variant='success'>{this.state.info}</Alert>}
            </div>
          </div>
          <div className="form-group row">
            <label htmlFor="server" className="col-sm-2 col-form-label">Server</label>
            <div className="col-sm-8">
              <select className="form-control" id="server" onChange={e => {
                const myValue = e.target.value
                myThis.onChangeCliConfig(cliConfig => cliConfig.server = myValue)
                if (myValue !== SERVER_MAIN) {
                  myThis.onChangeCliConfig(cliConfig => cliConfig.mix.autoAggregatePostmix = false)
                }
              }} defaultValue={cliConfig.server}>
                {Object.keys(WHIRLPOOL_SERVER).map((value) => <option value={value} key={value}>{WHIRLPOOL_SERVER[value]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group row">
            <label htmlFor="autoTx0" className="col-sm-2 col-form-label">Auto-TX0</label>
            <div className="col-sm-10">
              <div className="custom-control custom-switch">
                <input type="checkbox" className="custom-control-input" onChange={e => {
                  const myValue = checked(e)
                  myThis.onChangeCliConfig(cliConfig => cliConfig.mix.autoTx0 = myValue)
                  if (!myValue) {
                    myThis.onChangeCliConfig(cliConfig => cliConfig.mix.autoAggregatePostmix = false)
                  }
                }} defaultChecked={cliConfig.mix.autoTx0} id="autoTx0"/>
                <label className="custom-control-label" htmlFor="autoTx0">Automatically TX0 whole deposit account (when disabled, you can click "TX0" on deposit UTXO)</label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <label htmlFor="autoAggregatePostmix" className="col-sm-2 col-form-label">Auto-Aggregate</label>
            <div className="col-sm-10">
              {autoAggregatePostmixPossible && <div className="custom-control custom-switch">
                <input type="checkbox" className="custom-control-input" onChange={e => myThis.onChangeCliConfig(cliConfig => cliConfig.mix.autoAggregatePostmix = checked(e))} defaultChecked={cliConfig.mix.autoAggregatePostmix} id="autoAggregatePostmix"/>
                <label className="custom-control-label" htmlFor="autoAggregatePostmix">Aggregate deposit, premix & postmix when there is no more to mix (testnet only).{cliConfig.mix.autoTx0}</label></div>}
              {!autoAggregatePostmixPossible && <div><i>Only available with <strong>AutoTX0</strong> on <strong>TestNet</strong></i></div>}
            </div>
          </div>
          <div className="form-group row">
            <label htmlFor="autoMix" className="col-sm-2 col-form-label">Auto-MIX</label>
            <div className="col-sm-10">
              <div className="custom-control custom-switch">
                <input type="checkbox" className="custom-control-input" onChange={e => myThis.onChangeCliConfig(cliConfig => cliConfig.mix.autoMix = checked(e))} defaultChecked={cliConfig.mix.autoMix} id="autoMix"/>
                <label className="custom-control-label" htmlFor="autoMix">Add to MIX queue unmixed premix & postmix</label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <label htmlFor="pools" className="col-sm-2 col-form-label">Pool:</label>
            <div className="col-sm-8">
              {poolsService.isReady() && <div>
                <select className="form-control" id="pools" onChange={e => myThis.onChangeCliConfig(cliConfig => {
                const value = e.target.value
                cliConfig.mix.poolIdsByPriority = [value]
              })} defaultValue={poolIdValue}>
                <option value=''>{ALL_POOLS_LABEL}</option>
                {poolsService.getPoolsAvailable().map(pool => <option key={pool.poolId} value={pool.poolId}>{pool.poolId} (denomination: {utils.toBtc(pool.denomination)}btc, fee: {utils.toBtc(pool.feeValue)}, anonymity set: {pool.mixAnonymitySet})</option>)}
                </select>
              </div>}
              {!poolsService.isReady() && <div>
                <strong>{poolIdValue ? poolIdValue : ALL_POOLS_LABEL}</strong> <small><i><a href='#'>Please login to edit pools</a></i></small>
              </div>}
            </div>
          </div>

          <div className="form-group row">
            <label htmlFor="inputPassword3" className="col-sm-2 col-form-label">TOR</label>
            <div className="col-sm-8">
              <div className="form-check form-check-inline">
                <input className="form-check-input" type="checkbox" id="inlineCheckbox1" value="option1" disabled/>
                <label className="form-check-label" htmlFor="inlineCheckbox1">Enable TOR (coming soon)</label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-sm-5">
              <button type='button' className='btn btn-danger' onClick={this.onResetConfig}><FontAwesomeIcon icon={Icons.faExclamationTriangle} /> Reset CLI configuration</button>
            </div>
            <div className="col-sm-5">
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
