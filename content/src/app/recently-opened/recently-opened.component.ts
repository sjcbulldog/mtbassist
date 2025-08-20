import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BackendService } from '../backend/backend-service';
import { RecentEntry } from '../../comms';

interface GroupedRecents {
	label: string;
	entries: RecentEntry[];
	collapsed: boolean;
}

@Component({
	selector: 'app-recently-opened',
	standalone: true,
	imports: [CommonModule, MatIconModule],
	templateUrl: './recently-opened.component.html',
	styleUrls: ['./recently-opened.component.scss']
})
export class RecentlyOpenedComponent implements OnInit {
	groupedRecents: GroupedRecents[] = [];
	themeType: 'dark' | 'light' = 'light';

	constructor(private be: BackendService) {
		this.be.sendRequestWithArgs('recentlyOpened', this.groupedRecents);
		
		// Subscribe to theme changes
		this.be.theme.subscribe(theme => {
			if (theme === 'dark' || theme === 'light') {
				this.themeType = theme;
			}
			else {
				this.themeType = 'dark' ;
			}
		});
	}

	ngOnInit() {
		this.be.recentlyOpened.subscribe(entries => {
			this.groupedRecents = this.groupRecents(entries);
		});
	}

	groupRecents(entries: RecentEntry[]): GroupedRecents[] {
		const now = new Date();
		const day = 24 * 60 * 60 * 1000;
		const week = 7 * day;
		const groups: { [key: string]: RecentEntry[] } = {};
		for (const entry of entries) {
			const opened = new Date(entry.lastopened);
			const diff = now.getTime() - opened.getTime();
			let label = '';
			if (diff < day) label = 'Last Day';
			else if (diff < week) label = 'Last Week';
			else {
				label = opened.toLocaleString('default', { month: 'long', year: 'numeric' });
			}
			if (!groups[label]) groups[label] = [];
			groups[label].push(entry);
		}
		// Sort groups: Last Day, Last Week, then months descending
		const result: GroupedRecents[] = [];
		if (groups['Last Day']) result.push({ label: 'Last Day', entries: groups['Last Day'], collapsed: false });
		if (groups['Last Week']) result.push({ label: 'Last Week', entries: groups['Last Week'], collapsed: false });
		const months = Object.keys(groups).filter(l => l !== 'Last Day' && l !== 'Last Week').sort((a, b) => {
			// Sort by year then month descending
			const [am, ay] = a.split(' ');
			const [bm, by] = b.split(' ');
			if (ay !== by) return parseInt(by) - parseInt(ay);
			return new Date(`${bm} 1, ${by}`).getMonth() - new Date(`${am} 1, ${ay}`).getMonth();
		});
		for (const m of months) {
			result.push({ label: m, entries: groups[m], collapsed: true });
		}
		return result;
	}

	toggleCollapse(group: GroupedRecents) {
		group.collapsed = !group.collapsed;
	}

	openRecent(entry: RecentEntry) {
		this.be.sendRequestWithArgs('openRecent', entry.apppath);
	}
}
